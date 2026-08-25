"""Helpers to decide who owns a Schema and whether it is public. Shared by
the registration flow (register_table/register/create/update) so publicity
is always decided server-side from PUBLIC_CATALOGS + request.user.is_staff,
never from the client payload.
"""

from target.metadata.public_catalogs import PUBLIC_CATALOGS
from target.users.models import User

CATALOG_SYSTEM_USERNAME = "catalog_system"


class PublicSchemaPermissionError(PermissionError):
    """Raised when a non-admin tries to register a table from a public schema."""


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
