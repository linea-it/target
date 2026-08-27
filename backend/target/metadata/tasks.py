import logging
import time

from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone as django_timezone

from dblinea import MyDB
from dblinea.daiquiri_client import DaiquiriTapClient
from dblinea.daiquiri_client import DaiquiriTapError
from target.metadata.catalog_admin import register_derived_table
from target.metadata.filter_to_sql import build_select_sql
from target.metadata.models import MaterializationJob
from target.metadata.models import Table
from target.mydb.api.views import get_mydb_quota

from .notebook_utils import _notebook_to_ipynb_string
from .notebook_utils import _prepare_catalog_notebook
from .notebook_utils import _render_notebook_html

logger = logging.getLogger(__name__)

DAIQUIRI_TERMINAL_PHASES = {"COMPLETED", "ERROR", "ABORTED"}


@shared_task()
def generate_catalog_diagnostic(table_id):
    """Generate catalog diagnostic notebook and HTML in the background.

    This task is triggered when a cluster catalog is completed. It reads the
    registered table, executes the catalog QA notebook template with metadata
    injected, and stores both the rendered HTML and the executed notebook for
    download.
    """
    try:
        table = Table.objects.get(pk=table_id)
    except Table.DoesNotExist:
        return {"error": "Table not found"}

    if table.catalog_type != Table.CATALOG_TYPE_CLUSTER or not table.related_table:
        return {"error": "Diagnostic is only available for CAnVAS cluster catalogs"}

    table.catalog_diagnostic_status = Table.DIAGNOSTIC_STATUS_RUNNING
    table.catalog_diagnostic_error = ""
    table.save(update_fields=["catalog_diagnostic_status", "catalog_diagnostic_error"])

    try:
        context = _prepare_catalog_notebook(table)
        nb = context["notebook"]

        html = _render_notebook_html(nb)
        ipynb_content = _notebook_to_ipynb_string(nb)

        table.catalog_diagnostic_html = html
        table.catalog_diagnostic_status = Table.DIAGNOSTIC_STATUS_DONE
        table.catalog_diagnostic_error = ""

        filename = f"cluster_catalog_{table.schema.name}_{table.name}_qa.ipynb"
        # save=False: evita um save() completo do modelo, que sobrescreveria
        # campos como is_completed com valores obsoletos lidos pela task.
        table.catalog_diagnostic_notebook.save(
            filename,
            ContentFile(ipynb_content.encode("utf-8")),
            save=False,
        )
    except Exception as exc:  # noqa: BLE001
        table.catalog_diagnostic_status = Table.DIAGNOSTIC_STATUS_ERROR
        table.catalog_diagnostic_error = str(exc)
        table.catalog_diagnostic_html = ""
        # Keep any previous notebook file to avoid leaving a broken reference.
    else:
        table.catalog_diagnostic_updated_at = django_timezone.now()
    finally:
        table.save(
            update_fields=[
                "catalog_diagnostic_status",
                "catalog_diagnostic_error",
                "catalog_diagnostic_html",
                "catalog_diagnostic_notebook",
                "catalog_diagnostic_updated_at",
            ],
        )

    return {"status": table.catalog_diagnostic_status}


class MaterializationError(Exception):
    """Raised for a materialization failure that isn't a DaiquiriTapError -
    quota exceeded, missing join UCDs, etc. Message is safe to store on
    MaterializationJob.error and show to the end user.
    """


def _poll_daiquiri_job(client, daiquiri_job_id):
    """Blocks until `daiquiri_job_id` reaches a terminal phase, returning its
    final status dict. This is the only unbounded wait in the task - overall
    runtime is capped by the task's own time_limit/soft_time_limit, not by
    this loop itself.
    """
    while True:
        job_status = client.get_job_status(daiquiri_job_id)
        if job_status["phase"] in DAIQUIRI_TERMINAL_PHASES:
            return job_status
        time.sleep(settings.DAIQUIRI_JOB_POLL_INTERVAL_S)


def _property_id_column_name(table, ucd):
    column = table.columns.filter(ucd=ucd).first()
    return column.name if column else None


def _drop_table_if_exists(username, table_name):
    """Best-effort cleanup - logs and swallows errors so a failed rollback
    doesn't mask the original error that triggered it.
    """
    try:
        MyDB(username=username).drop_user_table(table_name)
    except Exception:  # noqa: BLE001
        logger.warning(
            "Failed to drop %s.%s while rolling back a materialization job",
            username,
            table_name,
            exc_info=True,
        )


def _raise_quota_exceeded(context):
    msg = f"mydb quota exceeded {context}."
    raise MaterializationError(msg)


def _raise_daiquiri_job_failed(status_dict, label):
    reason = status_dict.get("error_summary") or status_dict["phase"]
    msg = f"Daiquiri {label} job failed: {reason}"
    raise DaiquiriTapError(msg)


def _raise_missing_join_ucds():
    msg = (
        "Source cluster/members tables are missing the UCDs needed "
        "to join them (meta.id;meta.main / meta.id.cross)."
    )
    raise MaterializationError(msg)


def _check_quota(username, *, context):
    quota = get_mydb_quota(username)
    if quota["available_bytes"] <= 0:
        _raise_quota_exceeded(context)


def _submit_and_wait(client, sql, table_name, *, on_submitted):
    """Submits `sql` as `table_name` and blocks until Daiquiri finishes it.

    Calls `on_submitted(daiquiri_job_id)` right after submission, before
    polling starts - polling can run for a long time if Daiquiri is slow to
    pick up the job, and if it fails partway through (e.g. the job never
    leaves QUEUED), the MaterializationJob row should still record which
    Daiquiri job it was, for debugging.

    Returns (daiquiri_job_id, status_dict) - the caller decides what a
    non-terminal-success phase means, since that differs for the primary
    vs. the members query.
    """
    daiquiri_job_id = client.submit_and_run(sql, table_name)
    on_submitted(daiquiri_job_id)
    status_dict = _poll_daiquiri_job(client, daiquiri_job_id)
    return daiquiri_job_id, status_dict


def _build_members_join_sql(source_table, result_schema_name, result_table_name):
    """Builds the SQL for the members follow-up query: every member row
    belonging to a cluster present in the just-materialized primary result,
    joined back via the meta.id;meta.main / meta.id.cross UCDs.
    """
    property_id = _property_id_column_name(source_table, "meta.id;meta.main")
    related_property_id = _property_id_column_name(
        source_table.related_table,
        "meta.id.cross",
    )
    if not property_id or not related_property_id:
        _raise_missing_join_ucds()

    # property_id/related_property_id come from registered Column.ucd
    # lookups above (never from user input), so interpolating them into raw
    # SQL text here is safe - there's no way for a client-controlled value
    # to reach this string.
    extra_where_sql = f"{related_property_id} IN (SELECT {property_id} FROM {result_schema_name}.{result_table_name})"  # noqa: E501, S608
    return build_select_sql(
        source_table.related_table,
        {},  # filter_model only applies to the cluster's own columns
        extra_where_sql=extra_where_sql,
    )


def _register_results(job, source_table, *, is_cluster_with_members):
    # Title = the table name the user chose, not source_table.title - two
    # subsets of the same source table would otherwise get the exact same
    # display name ("Y6 Cluster WaZP (subset)"), indistinguishable in the
    # catalog list. The table name is already guaranteed unique per user
    # (validated in UserTableViewSet.materialize before the job is created).
    result_table = register_derived_table(
        job.owner,
        source_table,
        job.result_table_name,
        job.result_table_name,
    )
    if is_cluster_with_members:
        related_result_table = register_derived_table(
            job.owner,
            source_table.related_table,
            job.related_result_table_name,
            job.related_result_table_name,
        )
        result_table.related_table = related_result_table
        result_table.save(update_fields=["related_table"])
    return result_table


@shared_task(time_limit=900, soft_time_limit=840)
def run_materialization_job(job_id):
    """Drives one MaterializationJob end to end (issue #197): submits the
    filtered query to Daiquiri's TAP service, polls it to completion, and
    (for cluster catalogs) does the same for the members table, joined back
    to the just-created result via the meta.id;meta.main /
    meta.id.cross UCDs. On success, auto-registers the result table(s) in
    Canvas. On failure past the point a table was physically created,
    drops whatever was created - there's no distributed transaction between
    Canvas and Daiquiri, so rollback here is an explicit DROP TABLE.
    """
    try:
        job = MaterializationJob.objects.select_related(
            "owner",
            "source_table__schema",
            "source_table__related_table__schema",
        ).get(pk=job_id)
    except MaterializationJob.DoesNotExist:
        return {"error": "Materialization job not found"}

    job.status = MaterializationJob.STATUS_RUNNING
    job.error = ""
    job.save(update_fields=["status", "error"])

    username = job.owner.username
    result_schema_name = f"{settings.USER_SCHEMA_PREFIX}{username}"
    source_table = job.source_table
    is_cluster_with_members = (
        source_table.catalog_type == Table.CATALOG_TYPE_CLUSTER
        and source_table.related_table_id is not None
    )

    primary_table_created = False
    related_table_created = False

    try:
        _check_quota(
            username,
            context="- free up space before materializing a new table",
        )

        # --- Primary table ---
        client = DaiquiriTapClient(username=username)
        sql = build_select_sql(source_table, job.filter_model)

        def _save_primary_job_id(daiquiri_job_id):
            job.daiquiri_job_id_primary = daiquiri_job_id
            job.save(update_fields=["daiquiri_job_id_primary"])

        _daiquiri_job_id, primary_status = _submit_and_wait(
            client,
            sql,
            job.result_table_name,
            on_submitted=_save_primary_job_id,
        )
        primary_table_created = (
            True  # Daiquiri may have created the table even if a later phase failed.
        )
        if primary_status["phase"] != "COMPLETED":
            _raise_daiquiri_job_failed(primary_status, "primary")

        # --- Related (members) table, cluster catalogs only ---
        if is_cluster_with_members:
            related_sql = _build_members_join_sql(
                source_table,
                result_schema_name,
                job.result_table_name,
            )

            def _save_related_job_id(daiquiri_job_id):
                job.daiquiri_job_id_related = daiquiri_job_id
                job.save(update_fields=["daiquiri_job_id_related"])

            _related_daiquiri_job_id, related_status = _submit_and_wait(
                client,
                related_sql,
                job.related_result_table_name,
                on_submitted=_save_related_job_id,
            )
            related_table_created = True
            if related_status["phase"] != "COMPLETED":
                _raise_daiquiri_job_failed(related_status, "members")

        # --- Post-materialization quota check (preventive check above is
        # not atomic with Daiquiri's CREATE TABLE, which runs outside
        # Canvas's transactional control) ---
        _check_quota(username, context="by this materialization")

        # --- Auto-registration ---
        result_table = _register_results(
            job,
            source_table,
            is_cluster_with_members=is_cluster_with_members,
        )

    except Exception as exc:  # noqa: BLE001
        if related_table_created:
            _drop_table_if_exists(username, job.related_result_table_name)
        if primary_table_created:
            _drop_table_if_exists(username, job.result_table_name)
        job.status = MaterializationJob.STATUS_ERROR
        job.error = str(exc)
        job.save(update_fields=["status", "error"])
        return {"status": job.status, "error": job.error}

    job.result_table = result_table
    job.status = MaterializationJob.STATUS_DONE
    job.save(update_fields=["result_table", "status"])
    return {"status": job.status, "result_table_id": result_table.id}
