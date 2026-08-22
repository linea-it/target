"""Helpers to manage the columns Canvas reserves on every registered table
so users can evaluate the quality of each record: meta_quality_flag
(boolean, tri-state) and meta_comment (text). Shared by the registration
flow, the lazy self-healing check done on table access, and the
backfill_annotation_columns management command.
"""

from target.metadata.models import Table


class ReservedColumnConflictError(Exception):
    """Raised when a table already has a column name reserved by Canvas."""

    def __init__(self, columns):
        cols = ", ".join(sorted(columns))
        super().__init__(
            "Table already has column(s) reserved for Canvas annotations: "
            f"{cols}. Rename them in Daiquiri to use quality evaluation on "
            "this table.",
        )


class TableNotInDatabaseError(Exception):
    """Raised when a registered table no longer exists in the database."""

    def __init__(self, schema, tablename):
        super().__init__(f"Table {schema}.{tablename} not found in database")


def ensure_annotation_columns(db, tablename):
    """Garante que a tabela do usuário tenha as colunas reservadas para
    avaliação (meta_quality_flag, meta_comment).

    Aborta caso a tabela já tenha uma coluna com um desses nomes, para
    evitar sobrescrever silenciosamente uma coluna do usuário com semântica
    diferente.
    """
    existing_columns = set(db.get_table_columns(tablename))
    conflicts = existing_columns & set(Table.RESERVED_ANNOTATION_COLUMNS)
    if conflicts:
        raise ReservedColumnConflictError(conflicts)

    db.add_columns(tablename, Table.RESERVED_ANNOTATION_COLUMNS)


def ensure_annotation_columns_lazy(db, table):
    """Self-healing: garante as colunas de anotação de uma tabela já
    registrada, tentando criá-las na hora caso estejam faltando (ex: a
    tabela foi recriada no Daiquiri depois do registro no Canvas).

    Só executa o ALTER TABLE quando alguma coluna reservada realmente
    estiver ausente, para não pagar o custo/lock de um ALTER TABLE a cada
    acesso à tabela.

    Args:
        db (MyDB): instância já configurada para o schema do dono da tabela.
        table (Table): registro de metadata da tabela.

    Raises:
        TableNotInDatabaseError: a tabela não existe mais no banco.
        ReservedColumnConflictError: falha ao criar as colunas por colisão
            de nome com uma coluna existente do usuário.
    """
    if not db.table_exists(schema=table.schema.name, tablename=table.name):
        raise TableNotInDatabaseError(table.schema.name, table.name)

    existing_columns = set(db.get_table_columns(table.name))
    if set(Table.RESERVED_ANNOTATION_COLUMNS) - existing_columns:
        ensure_annotation_columns(db, table.name)
