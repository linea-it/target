"""Busca por área no endpoint data/ (issue #206: clusters vizinhos no Aladin).

Parâmetros: cone_ra, cone_dec, cone_radius (graus) e cone_method (q3c | box).
"""

from http import HTTPStatus
from unittest import mock

import pytest
from rest_framework.test import APIClient
from sqlalchemy.exc import ProgrammingError

from target.metadata.api.views import MAX_CONE_RADIUS_DEG
from target.metadata.models import Column
from target.metadata.models import Schema
from target.metadata.models import Table
from target.users.tests.factories import UserFactory


@pytest.fixture
def cluster_table(db):
    system_user = UserFactory(username="catalog_system")
    schema = Schema.objects.create(
        owner=system_user,
        name="a_public_schema",
        is_public=True,
    )
    table = Table.objects.create(
        schema=schema,
        name="clusters",
        title="Clusters",
        catalog_type=Table.CATALOG_TYPE_CLUSTER,
        is_completed=True,
        nrows=10,
    )
    for name, ucd, datatype in (
        ("id", "meta.id;meta.main", "bigint"),
        ("ra_deg", "pos.eq.ra;meta.main", "double precision"),
        ("dec_deg", "pos.eq.dec;meta.main", "double precision"),
    ):
        Column.objects.create(table=table, name=name, ucd=ucd, datatype=datatype)
    return table


@pytest.fixture
def mydb():
    with mock.patch("target.metadata.api.views.MyDB") as mock_mydb:
        mock_mydb.return_value.query.return_value = ([], 0)
        yield mock_mydb.return_value


def _get(table, **params):
    client = APIClient()
    client.force_authenticate(user=UserFactory())
    return client.get(f"/api/metadata/user_tables/{table.id}/data/", params)


@pytest.mark.django_db
def test_data_without_cone_has_no_area(cluster_table, mydb):
    response = _get(cluster_table)

    assert response.status_code == HTTPStatus.OK
    assert mydb.query.call_args.kwargs["area"] is None


@pytest.mark.django_db
def test_data_with_cone_passes_area_and_not_as_column_filter(cluster_table, mydb):
    response = _get(
        cluster_table,
        cone_ra="10.5",
        cone_dec="-20",
        cone_radius="0.25",
        cone_method="box",
        pageSize=500,
    )

    assert response.status_code == HTTPStatus.OK
    kwargs = mydb.query.call_args.kwargs
    assert kwargs["area"] == {
        "method": "box",
        "ra": 10.5,
        "dec": -20.0,
        "radius": 0.25,
        "ra_col": "ra_deg",
        "dec_col": "dec_deg",
    }
    assert kwargs["url_filters"] is None


@pytest.mark.django_db
def test_data_cone_method_defaults_to_box(cluster_table, mydb):
    _get(cluster_table, cone_ra="10", cone_dec="0", cone_radius="0.1")

    assert mydb.query.call_args.kwargs["area"]["method"] == "box"


@pytest.mark.django_db
def test_data_cone_radius_is_capped(cluster_table, mydb):
    _get(cluster_table, cone_ra="10", cone_dec="0", cone_radius="5")

    assert mydb.query.call_args.kwargs["area"]["radius"] == MAX_CONE_RADIUS_DEG


@pytest.mark.django_db
def test_data_cone_ra_is_normalized(cluster_table, mydb):
    _get(cluster_table, cone_ra="-1", cone_dec="0", cone_radius="0.1")

    assert mydb.query.call_args.kwargs["area"]["ra"] == 359.0  # noqa: PLR2004


@pytest.mark.django_db
@pytest.mark.parametrize(
    "params",
    [
        {"cone_ra": "10", "cone_dec": "0"},
        {"cone_ra": "abc", "cone_dec": "0", "cone_radius": "0.1"},
        {"cone_ra": "nan", "cone_dec": "0", "cone_radius": "0.1"},
        {"cone_ra": "10", "cone_dec": "91", "cone_radius": "0.1"},
        {"cone_ra": "10", "cone_dec": "0", "cone_radius": "0"},
        {"cone_ra": "10", "cone_dec": "0", "cone_radius": "0.1", "cone_method": "x"},
    ],
)
def test_data_invalid_cone_returns_400(cluster_table, mydb, params):
    response = _get(cluster_table, **params)

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "error" in response.json()
    mydb.query.assert_not_called()


@pytest.mark.django_db
def test_data_cone_without_radec_ucds_returns_400(cluster_table, mydb):
    cluster_table.columns.filter(name="ra_deg").update(ucd="")

    response = _get(cluster_table, cone_ra="10", cone_dec="0", cone_radius="0.1")

    assert response.status_code == HTTPStatus.BAD_REQUEST
    mydb.query.assert_not_called()


@pytest.mark.django_db
def test_data_q3c_without_extension_returns_501(cluster_table, mydb):
    mydb.query.side_effect = ProgrammingError(
        "SELECT ... q3c_radial_query(...)",
        {},
        Exception("function q3c_radial_query(...) does not exist"),
    )

    response = _get(cluster_table, cone_ra="10", cone_dec="0", cone_radius="0.1")

    assert response.status_code == HTTPStatus.NOT_IMPLEMENTED
    assert "cone_method=box" in response.json()["error"]
