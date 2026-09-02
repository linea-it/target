"""Unit tests for filter_to_sql.build_select_sql. Mocks MyDB.sa_table so no
real database connection is needed - a SQLAlchemy Table built in-memory
(sqlalchemy.table/Column) reflects the same interface build_select_sql
relies on (tbl.c, tbl.c[name]).
"""

from unittest import mock

import pytest
from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import MetaData
from sqlalchemy import String
from sqlalchemy import Table as SATable

from target.metadata.filter_to_sql import FilterToSqlError
from target.metadata.filter_to_sql import build_select_sql


def _fake_source_table():
    source_table = mock.Mock()
    source_table.name = "my_table"
    source_table.schema.name = "my_schema"
    return source_table


@pytest.fixture(autouse=True)
def _mock_sa_table():
    tbl = SATable(
        "my_table",
        MetaData(),
        Column("id", Integer),
        Column("ra", Integer),
        Column("label", String),
        schema="my_schema",
    )
    with mock.patch("target.metadata.filter_to_sql.MyDB") as mock_mydb:
        mock_mydb.return_value.sa_table.return_value = tbl
        yield tbl


def test_no_filters_selects_everything():
    sql = build_select_sql(_fake_source_table(), {})

    assert "SELECT" in sql
    assert "my_schema.my_table" in sql
    assert "WHERE" not in sql


def test_simple_equality_filter():
    sql = build_select_sql(
        _fake_source_table(),
        {"items": [{"field": "ra", "operator": "=", "value": 5}]},
    )

    assert "WHERE my_schema.my_table.ra = 5" in sql


def test_multiple_items_are_anded():
    sql = build_select_sql(
        _fake_source_table(),
        {
            "items": [
                {"field": "ra", "operator": ">", "value": 1},
                {"field": "ra", "operator": "<", "value": 10},
            ],
        },
    )

    assert "ra > 1" in sql
    assert "AND" in sql
    assert "ra < 10" in sql


def test_contains_produces_ilike_without_doubled_percent():
    sql = build_select_sql(
        _fake_source_table(),
        {"items": [{"field": "label", "operator": "contains", "value": "abc"}]},
    )

    assert "ILIKE '%abc%'" in sql
    assert "%%" not in sql


def test_starts_with_camel_case_is_recognized():
    sql = build_select_sql(
        _fake_source_table(),
        {"items": [{"field": "label", "operator": "startsWith", "value": "abc"}]},
    )

    assert "LIKE 'abc%'" in sql


def test_is_empty_ignores_value_and_checks_null():
    sql = build_select_sql(
        _fake_source_table(),
        {"items": [{"field": "label", "operator": "isEmpty", "value": True}]},
    )

    assert "IS NULL" in sql


def test_unknown_field_raises():
    with pytest.raises(FilterToSqlError, match="Unknown filter field"):
        build_select_sql(
            _fake_source_table(),
            {"items": [{"field": "not_a_column", "operator": "=", "value": 1}]},
        )


def test_unsupported_operator_raises():
    with pytest.raises(FilterToSqlError, match="Unsupported filter operator"):
        build_select_sql(
            _fake_source_table(),
            {"items": [{"field": "ra", "operator": "not_a_real_operator", "value": 1}]},
        )


def test_extra_where_sql_is_anded_in():
    sql = build_select_sql(
        _fake_source_table(),
        {"items": [{"field": "ra", "operator": "=", "value": 1}]},
        extra_where_sql="id IN (SELECT id FROM other_table)",
    )

    assert "ra = 1" in sql
    assert "id IN (SELECT id FROM other_table)" in sql
