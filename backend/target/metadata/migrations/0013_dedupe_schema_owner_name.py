# Data migration isolada de propósito: precisa da própria transação, sem
# nenhum DDL junto (nem da 0012 nem da 0014/AlterUniqueTogether). Testado
# na prática: o Django adia (deferred_sql) a criação de índice de um
# AddField de FK pro final da migration inteira, então mesmo pondo esse
# RunPython "depois" das AddField na mesma migration, o CREATE INDEX
# adiado ainda roda depois do UPDATE/DELETE daqui na mesma transação — e
# como as FKs de metadata_schema/metadata_table são DEFERRABLE INITIALLY
# DEFERRED, isso quebra com "cannot CREATE INDEX ... because it has
# pending trigger events". Por isso esta migration só tem o RunPython, e a
# 0014 (AlterUniqueTogether) foi deixada numa migration própria também.

from django.db import migrations


def dedupe_schemas(apps, schema_editor):
    """Colapsa Schema rows duplicados de (owner, name) num único registro
    antes da constraint unique_together ser criada na migration seguinte
    (0014) — sem isso, o deploy quebra com IntegrityError caso já existam
    duplicatas (nada impedia isso antes desta migration: get_or_create
    (owner=, name=) evita duplicata em uso normal, mas não é garantia a
    nível de banco).

    Para cada grupo duplicado, mantém o Schema mais antigo (menor id) como
    canônico e repointa as Table que apontavam pros outros antes de
    apagá-los — nenhuma Table é perdida.
    """
    Schema = apps.get_model("metadata", "Schema")
    Table = apps.get_model("metadata", "Table")

    canonical_by_key = {}
    for schema in Schema.objects.order_by("id"):
        key = (schema.owner_id, schema.name)
        canonical = canonical_by_key.get(key)
        if canonical is None:
            canonical_by_key[key] = schema
            continue

        Table.objects.filter(schema=schema).update(schema=canonical)
        schema.delete()


def noop(apps, schema_editor):
    """Merge de duplicatas não é reversível: não há como recriar os Schema
    apagados nem saber quais Table apontavam pra qual duplicata original."""


class Migration(migrations.Migration):

    dependencies = [
        ('metadata', '0012_schema_is_public_table_source_table_and_more'),
    ]

    operations = [
        migrations.RunPython(dedupe_schemas, noop),
    ]
