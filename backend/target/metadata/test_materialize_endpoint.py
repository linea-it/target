from http import HTTPStatus
from unittest import mock

import pytest
from rest_framework.test import APIClient

from target.metadata.models import MaterializationJob
from target.metadata.models import Schema
from target.metadata.models import Table
from target.users.tests.factories import UserFactory


@pytest.fixture
def public_table(db):
    system_user = UserFactory(username="catalog_system")
    schema = Schema.objects.create(
        owner=system_user,
        name="a_public_schema",
        is_public=True,
    )
    return Table.objects.create(
        schema=schema,
        name="a_public_table",
        title="Public",
        catalog_type=Table.CATALOG_TYPE_TARGET,
        is_completed=True,
    )


@pytest.fixture
def cluster_table(db):
    system_user = UserFactory(username="catalog_system_2")
    schema = Schema.objects.create(
        owner=system_user,
        name="a_public_cluster_schema",
        is_public=True,
    )
    members = Table.objects.create(
        schema=schema,
        name="a_public_members",
        title="Members",
        catalog_type=Table.CATALOG_TYPE_MEMBER,
        is_completed=True,
    )
    return Table.objects.create(
        schema=schema,
        name="a_public_cluster",
        title="Cluster",
        catalog_type=Table.CATALOG_TYPE_CLUSTER,
        is_completed=True,
        related_table=members,
    )


@pytest.fixture(autouse=True)
def _mock_task_delay():
    with mock.patch("target.metadata.api.views.run_materialization_job") as mock_task:
        yield mock_task


@pytest.mark.django_db
def test_materialize_creates_job_and_returns_202(public_table):
    client = APIClient()
    client.force_authenticate(user=UserFactory())

    response = client.post(
        f"/api/metadata/user_tables/{public_table.id}/materialize/",
        {"filter_model": {"items": [{"field": "ra", "operator": ">", "value": 1}]}},
        format="json",
    )

    assert response.status_code == HTTPStatus.ACCEPTED
    job = MaterializationJob.objects.get(id=response.json()["id"])
    assert job.source_table_id == public_table.id
    assert job.result_table_name.startswith("a_public_table_subset_")
    assert job.status == MaterializationJob.STATUS_PENDING


@pytest.mark.django_db
def test_materialize_uses_requested_table_name(public_table):
    client = APIClient()
    client.force_authenticate(user=UserFactory())

    response = client.post(
        f"/api/metadata/user_tables/{public_table.id}/materialize/",
        {"filter_model": {}, "table_name": "my_bright_clusters"},
        format="json",
    )

    assert response.status_code == HTTPStatus.ACCEPTED
    job = MaterializationJob.objects.get(id=response.json()["id"])
    assert job.result_table_name == "my_bright_clusters"


@pytest.mark.django_db
def test_materialize_derives_members_name_from_requested_name(cluster_table):
    client = APIClient()
    client.force_authenticate(user=UserFactory())

    response = client.post(
        f"/api/metadata/user_tables/{cluster_table.id}/materialize/",
        {"filter_model": {}, "table_name": "my_bright_clusters"},
        format="json",
    )

    assert response.status_code == HTTPStatus.ACCEPTED
    job = MaterializationJob.objects.get(id=response.json()["id"])
    assert job.result_table_name == "my_bright_clusters"
    assert job.related_result_table_name == "my_bright_clusters_members"


@pytest.mark.django_db
def test_materialize_rejects_invalid_table_name(public_table):
    client = APIClient()
    client.force_authenticate(user=UserFactory())

    response = client.post(
        f"/api/metadata/user_tables/{public_table.id}/materialize/",
        {"filter_model": {}, "table_name": "1 not a valid name!"},
        format="json",
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


@pytest.mark.django_db
def test_materialize_rejects_colliding_table_name(public_table):
    user = UserFactory()
    schema = Schema.objects.create(owner=user, name=f"mydb_{user.username}")
    Table.objects.create(
        schema=schema,
        name="already_taken",
        title="",
        catalog_type=Table.CATALOG_TYPE_TARGET,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        f"/api/metadata/user_tables/{public_table.id}/materialize/",
        {"filter_model": {}, "table_name": "already_taken"},
        format="json",
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


@pytest.mark.django_db
def test_materialize_404s_for_other_users_private_table(db):
    owner = UserFactory()
    schema = Schema.objects.create(owner=owner, name=f"mydb_{owner.username}")
    table = Table.objects.create(
        schema=schema,
        name="my_private_table",
        title="Private",
        catalog_type=Table.CATALOG_TYPE_TARGET,
        is_completed=True,
    )
    client = APIClient()
    client.force_authenticate(user=UserFactory())

    response = client.post(
        f"/api/metadata/user_tables/{table.id}/materialize/",
        {"filter_model": {}},
        format="json",
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


@pytest.mark.django_db
def test_materialize_rejects_concurrent_job_for_same_source(public_table):
    user = UserFactory()
    MaterializationJob.objects.create(
        owner=user,
        source_table=public_table,
        filter_model={},
        result_table_name="already_running",
        status=MaterializationJob.STATUS_RUNNING,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        f"/api/metadata/user_tables/{public_table.id}/materialize/",
        {"filter_model": {}},
        format="json",
    )

    assert response.status_code == HTTPStatus.TOO_MANY_REQUESTS


@pytest.mark.django_db
def test_materialize_allows_new_job_after_previous_one_finished(public_table):
    user = UserFactory()
    MaterializationJob.objects.create(
        owner=user,
        source_table=public_table,
        filter_model={},
        result_table_name="finished_one",
        status=MaterializationJob.STATUS_DONE,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        f"/api/metadata/user_tables/{public_table.id}/materialize/",
        {"filter_model": {}},
        format="json",
    )

    assert response.status_code == HTTPStatus.ACCEPTED


@pytest.mark.django_db
def test_materialization_job_viewset_only_shows_own_jobs(public_table):
    owner = UserFactory()
    other = UserFactory()
    job = MaterializationJob.objects.create(
        owner=owner,
        source_table=public_table,
        filter_model={},
        result_table_name="t1",
    )

    client = APIClient()
    client.force_authenticate(user=other)
    response = client.get(f"/api/metadata/materialization_jobs/{job.id}/")
    assert response.status_code == HTTPStatus.NOT_FOUND

    client.force_authenticate(user=owner)
    response = client.get(f"/api/metadata/materialization_jobs/{job.id}/")
    assert response.status_code == HTTPStatus.OK
