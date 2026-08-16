from django.core.management.base import BaseCommand

from dblinea import MyDB
from target.metadata.annotation import ReservedColumnConflictError
from target.metadata.annotation import TableNotInDatabaseError
from target.metadata.annotation import ensure_annotation_columns_lazy
from target.metadata.models import Table


class Command(BaseCommand):
    help = (
        "Adds the reserved annotation columns (meta_quality_flag, "
        "meta_comment) to every already-registered table that doesn't "
        "have them yet. Safe to run multiple times."
    )

    def handle(self, *args, **options):
        tables = Table.objects.filter(is_removed=False).select_related(
            "schema",
            "schema__owner",
        )

        updated = 0
        not_found = []
        conflicts = []

        for table in tables:
            full_name = f"{table.schema.name}.{table.name}"
            db = MyDB(username=table.schema.owner.username)

            try:
                # No-op quando as duas colunas já existem com o tipo certo
                # (ex: tabela registrada depois que essa feature já existia).
                ensure_annotation_columns_lazy(db, table)
            except TableNotInDatabaseError:
                not_found.append(full_name)
                continue
            except ReservedColumnConflictError as e:
                conflicts.append((full_name, str(e)))
                continue

            updated += 1

        self.stdout.write(self.style.SUCCESS(f"{updated} table(s) checked/updated."))

        if not_found:
            self.stdout.write(
                self.style.WARNING(
                    f"{len(not_found)} table(s) registered but not found in "
                    "the database (skipped):",
                ),
            )
            for name in not_found:
                self.stdout.write(f"  - {name}")

        if conflicts:
            self.stdout.write(
                self.style.ERROR(
                    f"{len(conflicts)} table(s) skipped due to a column "
                    "name conflict:",
                ),
            )
            for name, error in conflicts:
                self.stdout.write(f"  - {name}: {error}")
