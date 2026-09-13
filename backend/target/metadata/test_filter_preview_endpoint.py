from http import HTTPStatus
from unittest import mock

import pytest
from rest_framework.test import APIClient
from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import MetaData
from sqlalchemy import Table as SATable

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
def private_table(db):
    owner = UserFactory()
    schema = Schema.objects.create(owner=owner, name=f"mydb_{owner.username}")
    table = Table.objects.create(
        schema=schema,
        name="my_private_table",
        title="Private",
        catalog_type=Table.CATALOG_TYPE_TARGET,
        is_completed=True,
    )
    return owner, table


@pytest.fixture(autouse=True)
def _mock_sa_table():
    tbl = SATable(
        "a_public_table",
        MetaData(),
        Column("ra", Integer),
        schema="a_public_schema",
    )
    with mock.patch("target.metadata.filter_to_sql.MyDB") as mock_mydb:
        mock_mydb.return_value.sa_table.return_value = tbl
        yield tbl


@pytest.mark.django_db
def test_filter_preview_returns_sql_for_public_table(public_table):
    client = APIClient()
    client.force_authenticate(user=UserFactory())

    response = client.post(
        f"/api/metadata/user_tables/{public_table.id}/filter_preview/",
        {"filter_model": {"items": [{"field": "ra", "operator": ">", "value": 1}]}},
        format="json",
    )

    assert response.status_code == HTTPStatus.OK
    assert "ra > 1" in response.json()["sql"]


@pytest.mark.django_db
def test_filter_preview_rejects_unknown_column(public_table):
    client = APIClient()
    client.force_authenticate(user=UserFactory())

    response = client.post(
        f"/api/metadata/user_tables/{public_table.id}/filter_preview/",
        {"filter_model": {"items": [{"field": "nope", "operator": "=", "value": 1}]}},
        format="json",
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


@pytest.mark.django_db
def test_filter_preview_404s_for_other_users_private_table(private_table):
    _owner, table = private_table
    client = APIClient()
    client.force_authenticate(user=UserFactory())

    response = client.post(
        f"/api/metadata/user_tables/{table.id}/filter_preview/",
        {"filter_model": {}},
        format="json",
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
