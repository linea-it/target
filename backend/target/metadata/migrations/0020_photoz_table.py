from django.db import migrations, models


def reset_photoz(apps, schema_editor):
    # O formato antigo (photoz_hips: {catalogId, ...}) apontava para um
    # catálogo HiPS; o novo aponta para uma tabela photo-z registrada.
    Settings = apps.get_model("metadata", "Settings")
    Settings.objects.exclude(photoz={}).update(photoz={})


class Migration(migrations.Migration):

    dependencies = [
        ("metadata", "0019_settings_neighbor_clusters"),
    ]

    operations = [
        migrations.AlterField(
            model_name="table",
            name="catalog_type",
            field=models.CharField(
                choices=[
                    ("target", "target"),
                    ("cluster", "cluster"),
                    ("member", "member"),
                    ("photoz", "photoz"),
                ],
                default="target",
                help_text="Identifies whether the table represents a list of targets or clusters",
                max_length=10,
                verbose_name="Type of table",
            ),
        ),
        migrations.RenameField(
            model_name="settings",
            old_name="photoz_hips",
            new_name="photoz",
        ),
        migrations.AlterField(
            model_name="settings",
            name="photoz",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text=(
                    "Default photo-z overlay (area search on a photo-z table): "
                    "{tableId, factor, maxRadiusDeg, shape, sourceSize, colormap, "
                    "zMin, zMax, showOnOpen}."
                ),
                verbose_name="Photo-z",
            ),
        ),
        migrations.RunPython(reset_photoz, migrations.RunPython.noop),
    ]
