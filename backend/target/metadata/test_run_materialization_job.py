"""Unit tests for tasks.run_materialization_job. Mocks every external
system (Daiquiri HTTP calls, quota check, SQL generation, registration) so
these run without a live database/TAP service - the real end-to-end path
was validated manually against a running Daiquiri instance in dev (issue
#197); these tests lock in the orchestration/error-handling logic itself:
status transitions, rollback on failure, and the cluster+members join.
"""

from unittest import mock

import pytest

from target.metadata.models import MaterializationJob
from target.metadata.models import Schema
from target.metadata.models import Table
from target.metadata.tasks import run_materialization_job
from target.users.tests.factories import UserFactory


@pytest.fixture
def owner(db):
    return UserFactory(username="owner")


@pytest.fixture
def source_table(owner):
    schema = Schema.objects.create(owner=owner, name="des_y6_gold", is_public=True)
    return Table.objects.create(
        schema=schema,
        name="y6_cluster_wazp",
        title="Source",
        catalog_type=Table.CATALOG_TYPE_TARGET,
        is_completed=True,
    )


@pytest.fixture
def cluster_source_table(owner):
    schema = Schema.objects.create(owner=owner, name="des_y6_gold", is_public=True)
    members = Table.objects.create(
        schema=schema,
        name="y6_cluster_members_wazp",
        title="Members",
        catalog_type=Table.CATALOG_TYPE_MEMBER,
        is_completed=True,
    )
    return Table.objects.create(
        schema=schema,
        name="y6_cluster_wazp",
        title="Cluster",
        catalog_type=Table.CATALOG_TYPE_CLUSTER,
        is_completed=True,
        related_table=members,
    )


def _job(owner, source_table, **kwargs):
    return MaterializationJob.objects.create(
        owner=owner,
        source_table=source_table,
        filter_model={"items": []},
        result_table_name="y6_cluster_wazp_subset_1",
        **kwargs,
    )


@pytest.fixture(autouse=True)
def mock_quota_ok():
    with mock.patch("target.metadata.tasks.get_mydb_quota") as mock_quota:
        mock_quota.return_value = {"available_bytes": 1_000_000}
        yield mock_quota


@pytest.fixture
def mock_client():
    with mock.patch("target.metadata.tasks.DaiquiriTapClient") as mock_cls:
        client = mock_cls.return_value
        client.submit_and_run.return_value = "daiquiri-job-1"
        client.get_job_status.return_value = {
            "phase": "COMPLETED",
            "error_summary": None,
        }
        yield client


@pytest.fixture(autouse=True)
def _mock_build_sql():
    with mock.patch("target.metadata.tasks.build_select_sql", return_value="SELECT 1"):
        yield


@pytest.mark.django_db
def test_success_marks_done_and_registers_result(owner, source_table, mock_client):
    job = _job(owner, source_table)
    result_table = Table.objects.create(
        schema=Schema.objects.create(owner=owner, name="mydb_owner"),
        name=job.result_table_name,
        title="",
        catalog_type=Table.CATALOG_TYPE_TARGET,
    )
    with mock.patch(
        "target.metadata.tasks.register_derived_table",
        return_value=result_table,
    ) as mock_register:
        run_materialization_job(job.id)

    job.refresh_from_db()
    assert job.status == MaterializationJob.STATUS_DONE
    assert job.result_table_id == result_table.id
    assert job.daiquiri_job_id_primary == "daiquiri-job-1"
    mock_register.assert_called_once()


@pytest.mark.django_db
def test_quota_exceeded_before_submission_never_calls_daiquiri(
    owner,
    source_table,
    mock_client,
    mock_quota_ok,
):
    mock_quota_ok.return_value = {"available_bytes": 0}
    job = _job(owner, source_table)

    run_materialization_job(job.id)

    job.refresh_from_db()
    assert job.status == MaterializationJob.STATUS_ERROR
    assert "quota" in job.error.lower()
    mock_client.submit_and_run.assert_not_called()


@pytest.mark.django_db
def test_daiquiri_job_error_marks_error_and_drops_table(
    owner,
    source_table,
    mock_client,
):
    mock_client.get_job_status.return_value = {
        "phase": "ERROR",
        "error_summary": "boom",
    }
    job = _job(owner, source_table)

    with mock.patch("target.metadata.tasks._drop_table_if_exists") as mock_drop:
        run_materialization_job(job.id)

    job.refresh_from_db()
    assert job.status == MaterializationJob.STATUS_ERROR
    assert "boom" in job.error
    mock_drop.assert_called_once_with("owner", job.result_table_name)


@pytest.mark.django_db
def test_cluster_with_members_submits_two_jobs_and_links_them(
    owner,
    cluster_source_table,
    mock_client,
):
    from target.metadata.models import Column

    Column.objects.create(
        table=cluster_source_table,
        name="id_cluster",
        datatype="INTEGER",
        order=0,
        ucd="meta.id;meta.main",
    )
    Column.objects.create(
        table=cluster_source_table.related_table,
        name="cluster_id",
        datatype="INTEGER",
        order=0,
        ucd="meta.id.cross",
    )

    job = _job(
        owner,
        cluster_source_table,
        related_result_table_name="y6_cluster_members_wazp_subset_1",
    )
    schema = Schema.objects.create(owner=owner, name="mydb_owner")
    primary_result = Table.objects.create(
        schema=schema,
        name=job.result_table_name,
        title="",
        catalog_type=Table.CATALOG_TYPE_CLUSTER,
    )
    related_result = Table.objects.create(
        schema=schema,
        name=job.related_result_table_name,
        title="",
        catalog_type=Table.CATALOG_TYPE_MEMBER,
    )

    with mock.patch(
        "target.metadata.tasks.register_derived_table",
        side_effect=[primary_result, related_result],
    ):
        run_materialization_job(job.id)

    job.refresh_from_db()
    primary_result.refresh_from_db()
    assert job.status == MaterializationJob.STATUS_DONE
    assert job.daiquiri_job_id_related == "daiquiri-job-1"
    assert primary_result.related_table_id == related_result.id
    assert mock_client.submit_and_run.call_count == 2  # noqa: PLR2004 - submit primary + submit members


@pytest.mark.django_db
def test_missing_join_ucds_fails_before_second_submission(
    owner,
    cluster_source_table,
    mock_client,
):
    # cluster_source_table has no meta.id;meta.main / meta.id.cross columns set up
    job = _job(
        owner,
        cluster_source_table,
        related_result_table_name="y6_cluster_members_wazp_subset_1",
    )

    with mock.patch("target.metadata.tasks._drop_table_if_exists") as mock_drop:
        run_materialization_job(job.id)

    job.refresh_from_db()
    assert job.status == MaterializationJob.STATUS_ERROR
    assert "UCD" in job.error
    assert mock_client.submit_and_run.call_count == 1
    mock_drop.assert_called_once_with("owner", job.result_table_name)
