"""Unit tests for catalog_admin.register_derived_table: the auto-registration
step that replaces the manual ColumnAssociation wizard for a materialized
subset (issue #197) - it must inherit UCDs by column name and only mark the
table complete when the required UCDs actually made it across.
"""

from unittest import mock

import pytest

from target.metadata.catalog_admin import register_derived_table
from target.metadata.catalog_admin import register_table
from target.metadata.models import Column
from target.metadata.models import Schema
from target.metadata.models import Settings
from target.metadata.models import Table
from target.users.tests.factories import UserFactory


@pytest.fixture
def owner(db):
    return UserFactory()


@pytest.fixture
def source_table(owner):
    schema = Schema.objects.create(owner=owner, name="des_y6_gold", is_public=True)
    table = Table.objects.create(
        schema=schema,
        name="y6_cluster_wazp",
        title="Source",
        catalog_type=Table.CATALOG_TYPE_TARGET,
        is_completed=True,
    )
    Column.objects.create(
        table=table,
        name="id",
        datatype="INTEGER",
        order=0,
        ucd="meta.id;meta.main",
    )
    Column.objects.create(
        table=table,
        name="ra",
        datatype="FLOAT",
        order=1,
        ucd="pos.eq.ra;meta.main",
        unit="deg",
    )
    Column.objects.create(
        table=table,
        name="dec",
        datatype="FLOAT",
        order=2,
        ucd="pos.eq.dec;meta.main",
    )
    Column.objects.create(table=table, name="extra", datatype="FLOAT", order=3)
    return table


def _make_result_table(owner, name, column_names):
    schema = Schema.objects.create(owner=owner, name=f"mydb_{owner.username}")
    table = Table.objects.create(
        schema=schema,
        name=name,
        title="",
        catalog_type=Table.CATALOG_TYPE_TARGET,
    )
    for i, col_name in enumerate(column_names):
        Column.objects.create(table=table, name=col_name, datatype="FLOAT", order=i)
    return table


@pytest.mark.django_db
def test_inherits_ucds_by_matching_column_name_and_marks_complete(owner, source_table):
    result_table = _make_result_table(owner, "subset_1", ["id", "ra", "dec", "extra"])
    with mock.patch(
        "target.metadata.catalog_admin.register_table",
        return_value=result_table,
    ):
        derived = register_derived_table(owner, source_table, "subset_1", "My subset")

    assert derived.is_completed is True
    assert derived.source_table_id == source_table.id
    assert derived.columns.get(name="ra").ucd == "pos.eq.ra;meta.main"
    assert derived.columns.get(name="ra").unit == "deg"
    assert derived.columns.get(name="extra").ucd == ""


@pytest.mark.django_db
def test_missing_required_ucd_column_leaves_table_incomplete(owner, source_table):
    # subset without "dec" -> pos.eq.dec;meta.main never gets inherited
    result_table = _make_result_table(owner, "subset_2", ["id", "ra"])
    with mock.patch(
        "target.metadata.catalog_admin.register_table",
        return_value=result_table,
    ):
        derived = register_derived_table(owner, source_table, "subset_2", "My subset")

    assert derived.is_completed is False
    assert derived.columns.get(name="ra").ucd == "pos.eq.ra;meta.main"


@pytest.mark.django_db
def test_member_table_uses_related_required_ucds(owner, source_table):
    source_table.catalog_type = Table.CATALOG_TYPE_MEMBER
    source_table.save(update_fields=["catalog_type"])
    Column.objects.create(
        table=source_table,
        name="cross_id",
        datatype="INTEGER",
        order=4,
        ucd="meta.id.cross",
    )

    result_table = _make_result_table(
        owner,
        "subset_members",
        ["id", "ra", "dec", "cross_id"],
    )
    with mock.patch(
        "target.metadata.catalog_admin.register_table",
        return_value=result_table,
    ):
        derived = register_derived_table(
            owner,
            source_table,
            "subset_members",
            "My members subset",
        )

    assert derived.is_completed is True
    assert derived.columns.get(name="cross_id").ucd == "meta.id.cross"


@pytest.mark.django_db
def test_derived_table_inherits_source_settings(owner, source_table):
    Settings.objects.create(
        table=source_table,
        default_image="LSST_DP1_IRG_LIneA",
        default_fov=12,
        default_marker_size=7,
    )
    result_table = _make_result_table(owner, "subset_3", ["id", "ra", "dec"])
    with mock.patch(
        "target.metadata.catalog_admin.register_table",
        return_value=result_table,
    ):
        derived = register_derived_table(owner, source_table, "subset_3", "My subset")

    settings = Settings.objects.get(table=derived)
    assert settings.default_image == "LSST_DP1_IRG_LIneA"
    assert settings.default_fov == 12  # noqa: PLR2004
    assert settings.default_marker_size == 7  # noqa: PLR2004


@pytest.mark.django_db
def test_derived_table_gets_default_settings_when_source_has_none(
    owner,
    source_table,
):
    result_table = _make_result_table(owner, "subset_4", ["id", "ra", "dec"])
    with mock.patch(
        "target.metadata.catalog_admin.register_table",
        return_value=result_table,
    ):
        derived = register_derived_table(owner, source_table, "subset_4", "My subset")

    settings = Settings.objects.get(table=derived)
    assert settings.default_image == "DES_DR2_IRG_LIneA"
    assert settings.default_fov == 5  # noqa: PLR2004
    assert settings.default_marker_size == 5  # noqa: PLR2004


@pytest.mark.django_db
def test_register_table_creates_default_settings(owner):
    db = mock.Mock()
    db.table_exists.return_value = True
    db.get_table_status.return_value = {"row_estimate": 10, "total_bytes": 100}
    db.describe_table.return_value = []
    data = {
        "schema": f"mydb_{owner.username}",
        "name": "new_catalog",
        "title": "New",
        "description": "",
        "catalog_type": Table.CATALOG_TYPE_TARGET,
    }
    with (
        mock.patch("target.metadata.catalog_admin.MyDB", return_value=db),
        mock.patch("target.metadata.catalog_admin.ensure_annotation_columns"),
    ):
        table = register_table(owner, data)

    settings = Settings.objects.get(table=table)
    assert settings.default_image == "DES_DR2_IRG_LIneA"
