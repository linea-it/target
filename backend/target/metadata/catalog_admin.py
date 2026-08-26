"""Helpers to decide who owns a Schema and whether it is public. Shared by
the registration flow (register_table/register/create/update) so publicity
is always decided server-side from PUBLIC_CATALOGS + request.user.is_staff,
never from the client payload.
"""

from rest_framework.exceptions import PermissionDenied

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
