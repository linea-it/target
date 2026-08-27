"""Regression tests for UserTableViewSet's read-visibility rule (issue #197
spike found retrieve()/data() had no ownership check at all - any
authenticated user could read another user's private table by id).
"""

from http import HTTPStatus
from unittest import mock

import pytest
from rest_framework.test import APIClient

from target.metadata.models import Schema
from target.metadata.models import Table
from target.users.tests.factories import UserFactory


@pytest.fixture
def owner(db):
    return UserFactory()


@pytest.fixture
def other_user(db):
    return UserFactory()


@pytest.fixture
def private_table(owner):
    schema = Schema.objects.create(owner=owner, name=f"mydb_{owner.username}")
    return Table.objects.create(
        schema=schema,
        name="my_private_table",
        title="Private",
        catalog_type=Table.CATALOG_TYPE_TARGET,
        is_completed=True,
    )


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


@pytest.fixture(autouse=True)
def _mock_mydb():
    with mock.patch("target.metadata.api.views.MyDB") as mock_mydb:
        mock_mydb.return_value.get_user_tables.return_value = []
        yield mock_mydb


@pytest.mark.django_db
def test_other_user_cannot_retrieve_private_table(other_user, private_table):
    client = APIClient()
    client.force_authenticate(user=other_user)

    response = client.get(f"/api/metadata/user_tables/{private_table.id}/")

    assert response.status_code == HTTPStatus.NOT_FOUND


@pytest.mark.django_db
def test_owner_can_retrieve_own_table(owner, private_table):
    client = APIClient()
    client.force_authenticate(user=owner)

    response = client.get(f"/api/metadata/user_tables/{private_table.id}/")

    assert response.status_code == HTTPStatus.OK
    assert response.json()["id"] == private_table.id


@pytest.mark.django_db
def test_any_authenticated_user_can_retrieve_public_table(other_user, public_table):
    client = APIClient()
    client.force_authenticate(user=other_user)

    response = client.get(f"/api/metadata/user_tables/{public_table.id}/")

    assert response.status_code == HTTPStatus.OK


@pytest.mark.django_db
def test_unauthenticated_request_is_rejected(private_table):
    client = APIClient()

    response = client.get(f"/api/metadata/user_tables/{private_table.id}/")

    assert response.status_code in (401, 403)
