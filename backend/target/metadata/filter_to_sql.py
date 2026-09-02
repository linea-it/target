"""Compiles a MUI DataGrid filterModel into a literal (bind-free) SQL SELECT
against a public catalog table, to be submitted as-is to Daiquiri's TAP
service (issue #197). Reuses dblinea.operator_mapper.OperatorMapper - the
same operator vocabulary the existing /data/ endpoint already applies when
querying a table live - but compiles the clause to SQL text instead of
executing it.
"""

from sqlalchemy import select
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

from dblinea import MyDB
from dblinea.operator_mapper import OperatorMapper
from dblinea.operator_mapper import UnsupportedOperatorError

# Mirrors frontend/src/services/Api.js::parseFilterClause. That function
# flattens filterModel.items into `field__operator` query params for the
# existing /data/ endpoint, at which point every operator string is already
# lowercase-snake (`__startswith`, `__isnull`, ...), so OperatorMapper's
# synonym table only needs to recognize that shape plus a handful of literal
# MUI strings ("contains", "isAnyOf", ...). Here we consume the *raw*
# filterModel instead, before that flattening happens, so operators MUI
# actually sends in mixed case ("startsWith", "isEmpty", ...) need mapping
# to OperatorMapper's vocabulary explicitly - two of them ("startsWith"/
# "endsWith" camelCase, and "isEmpty"/"isNotEmpty") are not recognized by
# OperatorMapper.uniformize_operator() as MUI spells them.
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


class FilterToSqlError(Exception):
    """Raised for a filterModel that can't be turned into SQL - unknown
    column, unsupported operator, or malformed shape. Safe to show to the
    end user (never a stack trace or SQLAlchemy internals).
    """


def _reflect_source_table(source_table):
    schema_name = source_table.schema.name
    db = MyDB(schema=schema_name)
    return db.sa_table(tablename=source_table.name, schema=schema_name)


def _clause_for_item(operator_mapper, tbl, item):
    field_name = item.get("field")
    operator = item.get("operator")

    if not field_name or field_name not in tbl.c:
        msg = f"Unknown filter field: {field_name!r}"
        raise FilterToSqlError(msg)

    mapped_operator = MUI_OPERATOR_MAP.get(operator, operator)
    try:
        clause, _values = operator_mapper.apply_filter(
            field=tbl.c[field_name],
            operator=mapped_operator,
            value=item.get("value"),
        )
    except UnsupportedOperatorError as exc:
        msg = f"Unsupported filter operator: {operator!r}"
        raise FilterToSqlError(msg) from exc
    return clause


def build_select_sql(source_table, filter_model, *, extra_where_sql=None):
    """Returns a literal SQL SELECT string for `source_table`, with a WHERE
    clause built from `filter_model` (a raw MUI DataGrid filterModel:
    {"items": [{"field", "operator", "value"}, ...]}).

    Always selects every column except Canvas's own reserved annotation
    columns (equivalent to SELECT *, but as an explicit column list - same
    as dblinea.MyDB.query()'s own SELECT construction) so the materialized
    table's columns line up 1:1 by name with the source, which the
    auto-registration step depends on to inherit UCDs. The exclusion
    matters when `source_table` is itself a private, already-registered
    table (not just a public catalog): register_table() would already have
    ALTERed it to add meta_quality_flag/meta_comment, and carrying those
    into the subset makes register_derived_table()'s own register_table()
    call fail with "column already exists" on the new table.

    `extra_where_sql` is ANDed in as raw SQL text - only ever used
    internally (the cluster-members follow-up query), never sourced from
    user input.
    """
    from target.metadata.models import Table

    tbl = _reflect_source_table(source_table)

    items = (filter_model or {}).get("items") or []
    operator_mapper = OperatorMapper()
    clauses = [_clause_for_item(operator_mapper, tbl, item) for item in items]

    selected_columns = [
        col for col in tbl.c if col.name not in Table.RESERVED_ANNOTATION_COLUMNS
    ]
    stm = select(*selected_columns)
    if clauses:
        stm = stm.where(*clauses)
    if extra_where_sql is not None:
        stm = stm.where(text(extra_where_sql))

    # paramstyle="named" avoids a SQLAlchemy quirk of the default pyformat
    # paramstyle: it doubles every literal "%" (e.g. a LIKE '%foo%' clause)
    # to escape it for %-style param substitution, even though
    # literal_binds=True means no params are actually substituted here.
    compiled = stm.compile(
        dialect=postgresql.dialect(paramstyle="named"),
        compile_kwargs={"literal_binds": True},
    )
    return str(compiled)
