from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('metadata', '0013_dedupe_schema_owner_name'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='schema',
            unique_together={('owner', 'name')},
        ),
    ]
