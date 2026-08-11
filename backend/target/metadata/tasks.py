from celery import shared_task
from django.core.files.base import ContentFile
from django.utils import timezone as django_timezone

from target.metadata.models import Table

from .notebook_utils import _notebook_to_ipynb_string
from .notebook_utils import _prepare_catalog_notebook
from .notebook_utils import _render_notebook_html


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
