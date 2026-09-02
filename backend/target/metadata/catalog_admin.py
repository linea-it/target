"""Registration/permission rules for Schema and Table: who owns a Schema and
whether it's public, whether a table can be registered/managed, and the
registration flow itself (register_table/register). Free functions (not
viewset methods) so both UserTableViewSet and the materialization Celery
task (target.metadata.tasks, issue #197) can call them without a
request/viewset context. Shared so publicity is always decided server-side
from PUBLIC_CATALOGS + request.user.is_staff, never from the client payload.
"""

from django.conf import settings
from rest_framework.exceptions import PermissionDenied

from dblinea import MyDB
from target.metadata.annotation import ensure_annotation_columns
from target.metadata.public_catalogs import PUBLIC_CATALOGS
from target.users.models import User

CATALOG_SYSTEM_USERNAME = "catalog_system"


class PublicSchemaPermissionError(PermissionError):
    """Raised when a non-admin tries to register a table from a public schema."""


class TableManagePermissionError(PermissionDenied):
    """Raised when a user without manage rights tries to mutate a Table.

    Subclasses DRF's PermissionDenied (not the builtin PermissionError, like
    PublicSchemaPermissionError above) so it turns into a 403 on its own —
    this one is meant to be raised straight from viewset actions that don't
    already wrap it in a try/except, unlike create()'s explicit catch.
    """

    default_detail = "You do not have permission to manage this table."


class TableRegistrationError(Exception):
    """Raised when table registration fails."""


class TableAlreadyExistsError(TableRegistrationError):
    """Raised when attempting to register an already-registered table."""

    def __init__(self, schema, name):
        super().__init__(f"Table {schema}.{name} already registered")


class MissingRelatedTableError(TableRegistrationError):
    """Raised when a cluster catalog is registered without a related table."""

    def __init__(self):
        super().__init__("Related table must be provided for cluster catalogs.")


def get_catalog_system_user():
    """Returns the fixed system user that owns every public Schema.

    Created lazily on first use, not via data migration.
    """
    user, _created = User.objects.get_or_create(
        username=CATALOG_SYSTEM_USERNAME,
        defaults={"is_active": False},
    )
    return user


def resolve_schema_owner(user, schema_name):
    """Resolves who should own the Schema named `schema_name` and whether
    it is public.

    Returns:
        (owner, is_public): owner is the catalog system user for schemas
        listed in PUBLIC_CATALOGS (only staff may register those), or the
        requesting user otherwise.

    Raises:
        PublicSchemaPermissionError: schema_name is a public catalog and
        user is not staff.
    """
    if schema_name in PUBLIC_CATALOGS:
        if not user.is_staff:
            msg = f"Only admins can register tables from schema '{schema_name}'."
            raise PublicSchemaPermissionError(msg)
        return get_catalog_system_user(), True
    return user, False


def can_manage_table(user, table):
    """Whether `user` may mutate `table` (metadata edits, completion,
    removal): the real owner of its schema, or staff when the schema is
    public — since Schema.owner there is always the system user, never a
    real person (see resolve_schema_owner/get_catalog_system_user).

    Single source of truth for this check: used both to decide what the
    frontend shows (NestedTableSerializer.get_can_manage) and to gate the
    write endpoints themselves (UserTableViewSet.update/complete_registration/
    perform_destroy/catalog_diagnostic_regenerate) — the frontend gate alone
    is not a security boundary, since any authenticated client can call the
    API directly.
    """
    if table.schema.owner_id == user.pk:
        return True
    return table.schema.is_public and user.is_staff


def is_table_registered(tablename, schema):
    # Imported here (not at module scope) to avoid a models.py <->
    # catalog_admin.py import cycle risk if models.py ever needs helpers
    # from this module.
    from target.metadata.models import Table

    return Table.objects.filter(name=tablename, schema__name=schema).exists()


def register_table(user, data):
    """Registers one already-existing database table as a Canvas Table,
    inferring row count/size/columns from the live database - the manual
    wizard step (RegisterCatalog/BasicInformation.js + ColumnAssociation.js)
    still runs on top of this for UCD assignment; register_derived_table()
    (below) instead fills UCDs automatically from a source table.
    """
    from target.metadata.models import Column
    from target.metadata.models import Schema
    from target.metadata.models import Table

    owner, is_public = resolve_schema_owner(user, data.get("schema"))

    # Instancia do MyDB
    db = MyDB(schema=data.get("schema")) if is_public else MyDB(username=user.username)

    is_registered = is_table_registered(data.get("name"), data.get("schema"))
    if is_registered:
        raise TableAlreadyExistsError(data.get("schema"), data.get("name"))

    # Verifica se a tabela existe
    if not db.table_exists(schema=data.get("schema"), tablename=data.get("name")):
        table_name = f"{data.get('schema')}.{data.get('name')}"
        msg = f"Table {table_name} not found in database"
        raise TableRegistrationError(msg)

    # Garante as colunas de avaliação (meta_quality_flag, meta_comment)
    # antes de ler o schema da tabela, para que já apareçam no describe.
    # Não faz sentido ALTER TABLE num schema público compartilhado para
    # adicionar colunas de anotação pessoal.
    if not is_public:
        ensure_annotation_columns(db, data.get("name"))

    # Tamanho da tabela e quantidade de linhas estimadas.
    stats = db.get_table_status(tablename=data.get("name"))

    # Tenta usar o total de linhas estimado pelo postgres
    # para evitar a query count que pode ser demorada em tabelas grandes.
    nrows = stats.get("row_estimate")

    if nrows in (0, None, -1):
        # Total de linhas na tabela.
        nrows = db.get_count(tablename=data.get("name"))

    schema = Schema.objects.get_or_create(
        owner=owner,
        name=data.get("schema"),
        defaults={"is_public": is_public},
    )[0]

    table = Table.objects.create(
        schema=schema,
        name=data.get("name"),
        title=data.get("title"),
        description=data.get("description"),
        catalog_type=data.get("catalog_type"),
        nrows=nrows,
        size=stats.get("total_bytes"),
    )

    # Criar o registro das colunas da tabela.
    # As colunas reservadas para avaliação (meta_quality_flag,
    # meta_comment) ficam de fora do catálogo de Column: não aparecem
    # no grid nem no mapeamento de UCDs, apenas fluem "de graça" nas
    # linhas retornadas por MyDB.query() (SELECT *).
    columns = db.describe_table(tablename=table.name)
    for c in columns:
        if c.get("name") in Table.RESERVED_ANNOTATION_COLUMNS:
            continue
        Column.objects.create(
            table=table,
            name=c.get("name"),
            datatype=str(c.get("type").__repr__()),
            pythontype=str(c.get("python_type").__name__),
            order=c.get("order"),
        )

    table.refresh_from_db()

    return table


def register(user, data):
    # Register main table
    from target.metadata.models import Table

    table = register_table(user, data)

    try:
        # region Check related table
        # Check if the table is typed as 'cluster' and has related_table set
        if table.catalog_type == Table.CATALOG_TYPE_CLUSTER:
            related_tablename = data.get("related_table_name", None)
            if not related_tablename:
                raise MissingRelatedTableError  # noqa: TRY301

            # region Register related table if not registered
            if related_tablename:
                schema_name = related_tablename.split(".")[0]
                table_name = related_tablename.split(".")[-1]

                if is_table_registered(table_name, schema_name):
                    # Related table already registered, fetch it
                    related_owner, _is_public = resolve_schema_owner(
                        user,
                        schema_name,
                    )
                    related_table = Table.objects.get(
                        name=table_name,
                        schema__name=schema_name,
                        schema__owner=related_owner,
                    )
                    table.related_table = related_table
                    table.save()

                else:
                    # Related table not registered,
                    # register it now
                    related_data = {
                        "schema": schema_name,
                        "name": table_name,
                        "title": f"Auto registered {table_name}",
                        "description": "",
                        "catalog_type": Table.CATALOG_TYPE_MEMBER,
                    }

                    related_table = register_table(user, related_data)
                    table.related_table = related_table
                    table.save()
        # endregion
    except Exception:
        if table:
            table.delete()
        raise

    table.refresh_from_db()
    return table


def register_derived_table(owner, source_table, result_table_name, title):
    """Registers a table just materialized by Daiquiri into `owner`'s own
    mydb schema as a derived subset of `source_table` (issue #197): runs
    the normal register_table() flow for stats/columns, then - instead of
    the manual ColumnAssociation wizard step - inherits ucd/unit/description
    for every column whose name matches a column of `source_table`. That
    name match is guaranteed by filter_to_sql.build_select_sql always
    selecting every column, so the materialized table's columns line up
    1:1 by name with the source.

    Only marks the table is_completed=True if every UCD required for its
    catalog_type made it across - never marks it complete "hopefully".
    For a cluster+members pair, call this twice (once per table) and link
    them (result.related_table = members_result) - this function handles
    one table at a time.
    """
    from target.metadata.models import Table

    schema_name = f"{settings.USER_SCHEMA_PREFIX}{owner.username}"
    catalog_type = (
        Table.CATALOG_TYPE_MEMBER
        if source_table.catalog_type == Table.CATALOG_TYPE_MEMBER
        else source_table.catalog_type
    )
    data = {
        "schema": schema_name,
        "name": result_table_name,
        "title": title,
        "description": (
            f"Subset of {source_table.schema.name}.{source_table.name}, "
            f"filtered by {owner.username} (issue #197)."
        ),
        "catalog_type": catalog_type,
    }
    table = register_table(owner, data)

    source_columns_by_name = {c.name: c for c in source_table.columns.all()}
    for column in table.columns.all():
        source_column = source_columns_by_name.get(column.name)
        if source_column is None:
            continue
        column.ucd = source_column.ucd
        column.unit = source_column.unit
        column.description = source_column.description
        column.save(update_fields=["ucd", "unit", "description"])

    table.source_table = source_table
    table.save(update_fields=["source_table"])

    required_ucds = (
        Table.RELATED_REQUIRED_UCDS
        if catalog_type == Table.CATALOG_TYPE_MEMBER
        else Table.REQUIRED_UCDS
    )
    present_ucds = {c.ucd for c in table.columns.all() if c.ucd}
    missing = [ucd for ucd in required_ucds if ucd not in present_ucds]
    if not missing:
        table.is_completed = True
        table.save(update_fields=["is_completed"])

    table.refresh_from_db()
    return table
