"""Validate and compile recursive catalog filter expressions."""
# ruff: noqa: C901, EM101, EM102, PLC0415, PLR0912, TRY003

from sqlalchemy import and_
from sqlalchemy import not_
from sqlalchemy import or_
from sqlalchemy import select
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

from dblinea import MyDB
from dblinea.operator_mapper import OperatorMapper
from dblinea.operator_mapper import UnsupportedOperatorError

MUI_OPERATOR_MAP = {
    "=": "__eq",
    "!=": "__ne",
    ">": "__gt",
    ">=": "__gte",
    "<": "__lt",
    "<=": "__lte",
    "equals": "__eq",
    "doesNotEqual": "__ne",
    "contains": "__contains",
    "doesNotContain": "__notcontains",
    "startsWith": "__startswith",
    "endsWith": "__endswith",
    "isAnyOf": "__in",
    "is": "__is",
    "isEmpty": "__isnull",
    "isNotEmpty": "__isnotnull",
}
VALUELESS = {"isEmpty", "isNotEmpty"}
MAX_FILTER_DEPTH = 8
MAX_FILTER_NODES = 50


class FilterToSqlError(Exception):
    pass


def _reflect_source_table(source):
    db = MyDB(schema=source.schema.name)
    return db.sa_table(tablename=source.name, schema=source.schema.name)


def _legacy_filter_model(node):
    """Accept a stored MUI filterModel alongside the expression tree."""
    if not isinstance(node, dict) or "items" not in node or node.get("type"):
        return node
    children = [
        {
            "type": "condition",
            "field": item.get("field"),
            "operator": item.get("operator"),
            "value": item.get("value"),
            "negated": False,
        }
        for item in node.get("items") or []
        if isinstance(item, dict)
    ]
    return {
        "type": "group",
        "operator": "or" if node.get("logicOperator") == "or" else "and",
        "negated": False,
        "children": children,
    }


def compile_filter_expression(tbl, node, _depth=0, _counter=None):
    if _depth == 0:
        node = _legacy_filter_model(node)
        _counter = [0]
    if node in (None, {}):
        return None
    if _counter is not None:
        _counter[0] += 1
        if _counter[0] > MAX_FILTER_NODES:
            raise FilterToSqlError("Filter expression is too large.")
    if _depth > MAX_FILTER_DEPTH:
        raise FilterToSqlError("Filter expression is too deep.")
    if not isinstance(node, dict):
        raise FilterToSqlError("Filter expression must be an object.")
    if not isinstance(node.get("negated", False), bool):
        raise FilterToSqlError("Filter negated flag must be boolean.")
    if node.get("type") == "condition":
        field, operator = node.get("field"), node.get("operator")
        if not field or field not in tbl.c:
            raise FilterToSqlError(f"Unknown filter field: {field!r}")
        if operator not in MUI_OPERATOR_MAP:
            raise FilterToSqlError(f"Unsupported filter operator: {operator!r}")
        if operator not in VALUELESS and "value" not in node:
            raise FilterToSqlError("Filter condition is missing a value.")
        try:
            clause, _ = OperatorMapper().apply_filter(
                tbl.c[field],
                MUI_OPERATOR_MAP[operator],
                node.get("value"),
            )
        except (UnsupportedOperatorError, TypeError, ValueError) as exc:
            raise FilterToSqlError(
                f"Invalid value for filter operator: {operator!r}",
            ) from exc
        return not_(clause) if node.get("negated", False) else clause
    if node.get("type") != "group":
        raise FilterToSqlError(f"Unknown filter node type: {node.get('type')!r}")
    operator, children = node.get("operator"), node.get("children")
    if operator not in ("and", "or"):
        raise FilterToSqlError(f"Invalid group operator: {operator!r}")
    if not isinstance(children, list):
        raise FilterToSqlError("Filter group children must be an array.")
    clauses = [
        value
        for value in (
            compile_filter_expression(tbl, child, _depth + 1, _counter)
            for child in children
        )
        if value is not None
    ]
    if not clauses:
        return None
    clause = and_(*clauses) if operator == "and" else or_(*clauses)
    return not_(clause) if node.get("negated", False) else clause


def build_select_sql(source, expression, *, extra_where_sql=None):
    from target.metadata.models import Table

    tbl = _reflect_source_table(source)
    clause = compile_filter_expression(tbl, expression)
    stm = select(
        *(col for col in tbl.c if col.name not in Table.RESERVED_ANNOTATION_COLUMNS),
    )
    if clause is not None:
        stm = stm.where(clause)
    if extra_where_sql is not None:
        stm = stm.where(text(extra_where_sql))
    return str(
        stm.compile(
            dialect=postgresql.dialect(paramstyle="named"),
            compile_kwargs={"literal_binds": True},
        ),
    )
