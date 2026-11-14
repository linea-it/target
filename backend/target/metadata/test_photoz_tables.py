"""Tabelas de photo-z (catalog_type=photoz) para o overlay do Aladin do
Cluster Detail: listagem, registro (UCD de z obrigatória) e o campo meta_z
no endpoint data/, com busca por área e filtro de intervalo de z.
"""

from http import HTTPStatus
from unittest import mock

import pytest
from rest_framework.test import APIClient

from target.metadata.models import Column
from target.metadata.models import Schema
from target.metadata.models import Table
from target.users.tests.factories import UserFactory

PHOTOZ_COLUMNS = (
    ("coadd_id", "meta.id;meta.main", "bigint"),
    ("ra", "pos.eq.ra;meta.main", "double precision"),
    ("dec", "pos.eq.dec;meta.main", "double precision"),
    ("z_mean", Table.PHOTOZ_UCD, "double precision"),
)


def _make_table(schema, name, *, catalog_type=Table.CATALOG_TYPE_PHOTOZ, **kwargs):
    defaults = {"title": name.title(), "is_completed": True, "nrows": 10}
    defaults.update(kwargs)
    return Table.objects.create(
        schema=schema,
        name=name,
        catalog_type=catalog_type,
        **defaults,
    )


def _add_columns(table, columns=PHOTOZ_COLUMNS):
    for name, ucd, datatype in columns:
        Column.objects.create(table=table, name=name, ucd=ucd, datatype=datatype)


@pytest.fixture
def user(db):
    return UserFactory(username="alice")


@pytest.fixture
def own_schema(user):
    return Schema.objects.create(owner=user, name="mydb_alice")


@pytest.fixture
def public_schema(db):
    return Schema.objects.create(
        owner=UserFactory(username="catalog_system"),
        name="des_photoz",
        is_public=True,
    )


@pytest.fixture
def public_photoz(public_schema):
    table = _make_table(public_schema, "photoz_public")
    _add_columns(table)
    return table


@pytest.fixture
def client(user):
    api = APIClient()
    api.force_authenticate(user=user)
    return api


@pytest.fixture
def mydb():
    with mock.patch("target.metadata.api.views.MyDB") as mock_mydb:
        mock_mydb.return_value.query.return_value = (
            [{"coadd_id": 7, "ra": 10.0, "dec": -5.0, "z_mean": 0.42}],
            1,
        )
        yield mock_mydb.return_value


@pytest.mark.django_db
def test_photoz_tables_lists_own_and_public(client, own_schema, public_photoz):
    own = _make_table(own_schema, "my_photoz")
    _add_columns(own)
    # Não entram: incompleta, de outro tipo, removida e de outro usuário.
    _make_table(own_schema, "pending_photoz", is_completed=False)
    _make_table(own_schema, "targets", catalog_type=Table.CATALOG_TYPE_TARGET)
    _make_table(own_schema, "removed_photoz", is_removed=True)
    other_schema = Schema.objects.create(owner=UserFactory(), name="mydb_bob")
    _make_table(other_schema, "bob_photoz")

    response = client.get("/api/metadata/user_tables/photoz_tables/")

    assert response.status_code == HTTPStatus.OK
    by_id = {item["id"]: item for item in response.json()}
    assert set(by_id) == {own.id, public_photoz.id}
    assert by_id[public_photoz.id]["z_column"] == "z_mean"
    assert by_id[public_photoz.id]["is_public"] is True
    assert by_id[own.id]["schema"] == "mydb_alice"
    assert by_id[own.id]["table"] == "my_photoz"


@pytest.mark.django_db
def test_complete_registration_requires_photoz_ucd(client, own_schema):
    table = _make_table(own_schema, "my_photoz", is_completed=False)
    _add_columns(table, PHOTOZ_COLUMNS[:3])  # sem a coluna de z

    response = client.post(
        f"/api/metadata/user_tables/{table.id}/complete_registration/",
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["missing_ucds"] == [Table.PHOTOZ_UCD]
    table.refresh_from_db()
    assert table.is_completed is False


@pytest.mark.django_db
def test_complete_registration_photoz(client, own_schema):
    table = _make_table(own_schema, "my_photoz", is_completed=False)
    _add_columns(table)

    response = client.post(
        f"/api/metadata/user_tables/{table.id}/complete_registration/",
    )

    assert response.status_code == HTTPStatus.OK
    table.refresh_from_db()
    assert table.is_completed is True


@pytest.mark.django_db
def test_data_returns_meta_z_with_area_and_range(client, public_photoz, mydb):
    response = client.get(
        f"/api/metadata/user_tables/{public_photoz.id}/data/",
        {
            "cone_ra": "10",
            "cone_dec": "-5",
            "cone_radius": "0.2",
            "cone_method": "box",
            "z_mean__gte": "0.1",
            "z_mean__lte": "0.9",
            "pageSize": "5000",
        },
    )

    assert response.status_code == HTTPStatus.OK
    row = response.json()["results"][0]
    assert row["meta_z"] == 0.42  # noqa: PLR2004
    assert row["meta_id"] == "7"

    kwargs = mydb.query.call_args.kwargs
    assert kwargs["url_filters"] == {"z_mean__gte": "0.1", "z_mean__lte": "0.9"}
    assert kwargs["area"]["method"] == "box"
    assert kwargs["area"]["ra_col"] == "ra"
    assert kwargs["limit"] == 5000  # noqa: PLR2004
