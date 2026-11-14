from django.db import migrations, models


def reset_neighbor_clusters(apps, schema_editor):
    # O formato antigo (cluster_hips: {catalogId, ...}) não é compatível
    # com o novo overlay de clusters vizinhos; recomeça sem default.
    Settings = apps.get_model("metadata", "Settings")
    Settings.objects.exclude(neighbor_clusters={}).update(neighbor_clusters={})


class Migration(migrations.Migration):

    dependencies = [
        ("metadata", "0018_settings_hips_defaults"),
    ]

    operations = [
        migrations.RenameField(
            model_name="settings",
            old_name="cluster_hips",
            new_name="neighbor_clusters",
        ),
        migrations.AlterField(
            model_name="settings",
            name="neighbor_clusters",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text=(
                    "Default neighbor clusters overlay (area search on this table): "
                    "{factor, maxRadiusDeg, method, color, opacity, lineWidth, showOnOpen}."
                ),
                verbose_name="Neighbor clusters",
            ),
        ),
        migrations.RunPython(reset_neighbor_clusters, migrations.RunPython.noop),
    ]
