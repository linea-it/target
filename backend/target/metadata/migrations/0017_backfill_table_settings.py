# Data migration isolada (só RunPython, sem DDL), seguindo o mesmo cuidado
# da 0013: as FKs de metadata_* são DEFERRABLE INITIALLY DEFERRED.

from django.db import migrations


def backfill_table_settings(apps, schema_editor):
    """Cria Settings para todo Table que ainda não tem - até aqui o registro
    só nascia quando alguém salvava a página de settings, e sem ele o Aladin
    ficava sem imagem default.

    Tabelas originais recebem os defaults do model; subsets (source_table)
    herdam as settings do catálogo de origem. As originais são processadas
    primeiro para que a origem já tenha Settings quando o subset for copiar.
    """
    Settings = apps.get_model("metadata", "Settings")
    Table = apps.get_model("metadata", "Table")

    missing = Table.objects.filter(settings__isnull=True)

    for table in missing.filter(source_table__isnull=True):
        Settings.objects.create(table=table)

    for table in missing.filter(source_table__isnull=False).order_by("id"):
        source = Settings.objects.filter(table_id=table.source_table_id).first()
        if source is None:
            Settings.objects.create(table=table)
            continue
        Settings.objects.create(
            table=table,
            default_image=source.default_image,
            default_fov=source.default_fov,
            default_marker_size=source.default_marker_size,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("metadata", "0016_settings_defaults_arcmin_arcsec"),
    ]

    operations = [
        migrations.RunPython(backfill_table_settings, migrations.RunPython.noop),
    ]
