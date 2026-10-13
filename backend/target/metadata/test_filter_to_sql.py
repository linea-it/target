# ruff: noqa: PLR2004, PT018
from unittest import mock

import pytest
from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import MetaData
from sqlalchemy import String
from sqlalchemy import Table as SATable

from target.metadata.filter_to_sql import MAX_FILTER_DEPTH
from target.metadata.filter_to_sql import FilterToSqlError
from target.metadata.filter_to_sql import build_select_sql


def source():
    value = mock.Mock()
    value.name = "my_table"
    value.schema.name = "my_schema"
    return value


@pytest.fixture(autouse=True)
def table():
    tbl = SATable(
        "my_table",
        MetaData(),
        Column("id", Integer),
        Column("ra", Integer),
        Column("label", String),
        schema="my_schema",
    )
    with mock.patch("target.metadata.filter_to_sql.MyDB") as db:
        db.return_value.sa_table.return_value = tbl
        yield tbl


def c(field, operator, value=None, **kw):
    node = {"type": "condition", "field": field, "operator": operator, **kw}
    if value is not None:
        node["value"] = value
    return node


def g(operator, *children, **kw):
    return {"type": "group", "operator": operator, "children": list(children), **kw}


def test_nested_and_or_not_and_duplicates():
    sql = build_select_sql(
        source(),
        g(
            "and",
            c("ra", ">", 1),
            g(
                "or",
                c("label", "contains", "a"),
                c("label", "contains", "b"),
                negated=True,
            ),
            c("ra", ">", 1),
        ),
    )
    assert sql.count("ra > 1") == 2 and " OR " in sql and "NOT" in sql


def test_condition_not():
    assert "ra != 2" in build_select_sql(
        source(),
        g("and", c("ra", "=", 2, negated=True)),
    )


def test_empty():
    assert "WHERE" not in build_select_sql(source(), g("and"))


@pytest.mark.parametrize(
    ("expr", "message"),
    [
        (c("missing", "=", 1), "Unknown"),
        (c("ra", "bad", 1), "Unsupported"),
        (g("xor"), "Invalid group"),
        ({"type": "wat"}, "Unknown filter node"),
    ],
)
def test_validation(expr, message):
    with pytest.raises(FilterToSqlError, match=message):
        build_select_sql(source(), expr)


def test_legacy_mui_items_are_anded():
    sql = build_select_sql(
        source(),
        {
            "items": [
                {"field": "ra", "operator": ">", "value": 1},
                {"field": "ra", "operator": "<", "value": 9},
            ],
        },
    )
    assert "ra > 1" in sql and "AND" in sql and "ra < 9" in sql


def test_legacy_empty_items_have_no_where():
    assert "WHERE" not in build_select_sql(source(), {"items": []})


def test_expression_too_deep():
    node = c("ra", "=", 1)
    for _ in range(MAX_FILTER_DEPTH + 2):
        node = g("and", node)
    with pytest.raises(FilterToSqlError, match="too deep"):
        build_select_sql(source(), node)


def test_literal_and_extra_where():
    sql = build_select_sql(
        source(),
        g("and", c("label", "contains", "abc")),
        extra_where_sql="id IN (SELECT id FROM other)",
    )
    assert "ILIKE '%abc%'" in sql and "%%" not in sql and "id IN" in sql
