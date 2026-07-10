import base64
import io
import json
import math
import traceback as tb
from contextlib import redirect_stderr
from contextlib import redirect_stdout
from pathlib import Path

import nbformat
from django.conf import settings
from django.http import HttpResponse
from nbconvert import HTMLExporter
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from dblinea import MyDB
from target.metadata.models import Column
from target.metadata.models import Schema
from target.metadata.models import Settings
from target.metadata.models import Table

from .serializers import ColumnSerializer
from .serializers import NestedTableSerializer
from .serializers import SchemaSerializer
from .serializers import SettingsSerializer
from .serializers import TableSerializer


_NULL_STRINGS = frozenset({"", "none", "nan", "null", "undefined", "na", "n/a"})


def _is_nullish(value):
    if value is None:
        return True
    if isinstance(value, bool):
        return False
    if isinstance(value, str):
        return value.strip().lower() in _NULL_STRINGS or value == "None"
    if isinstance(value, float):
        return not math.isfinite(value)
    if type(value).__module__ == "numpy":
        import numpy as np

        if isinstance(value, np.floating):
            return not np.isfinite(value)
        return False
    try:
        from decimal import Decimal
    except ImportError:
        return False
    else:
        if isinstance(value, Decimal):
            return value.is_nan() or value.is_infinite()
    return False


def _sanitize_scalar(value):
    if _is_nullish(value):
        return None
    if type(value).__module__ == "numpy":
        return value.item()
    try:
        from decimal import Decimal
    except ImportError:
        return value
    else:
        if isinstance(value, Decimal):
            return float(value)
    return value


def _meta_field(value):
    if _is_nullish(value):
        return None
    return str(value)


def sanitize_data(data, bigint_columns=None):
    if isinstance(data, list):
        return [sanitize_data(item, bigint_columns) for item in data]
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if isinstance(value, dict):
                result[key] = sanitize_data(value, bigint_columns)
            elif isinstance(value, list):
                result[key] = sanitize_data(value, bigint_columns)
            elif _is_nullish(value):
                result[key] = None
            elif (
                bigint_columns
                and key in bigint_columns
                and isinstance(value, int)
                and value > 9007199254740991  # noqa: PLR2004
            ):
                result[key] = str(value)
            else:
                result[key] = _sanitize_scalar(value)
        return result
    return data


def _figure_has_content(fig):
    return any(ax.has_data() for ax in fig.axes)


def _notebook_for_display(nb):
    """Keep markdown and figure outputs only (no code source or stdout)."""
    display_cells = []
    for cell in nb.cells:
        if cell.cell_type == "markdown":
            display_cells.append(cell)
            continue
        if cell.cell_type != "code":
            continue

        outputs = [
            output
            for output in cell.outputs
            if output.get("output_type") in ("display_data", "error")
            and (
                output.get("output_type") == "error"
                or any(
                    mime.startswith("image/")
                    for mime in output.get("data", {})
                )
            )
        ]
        if not outputs:
            continue

        display_cell = nbformat.v4.new_code_cell(source="")
        display_cell.outputs = outputs
        display_cells.append(display_cell)

    display_nb = nbformat.v4.new_notebook(cells=display_cells)
    display_nb.metadata = nb.metadata
    return display_nb


def _execute_notebook_inprocess(nb):
    """Execute notebook code cells in-process, capturing outputs."""
    namespace = {}

    # Ensure matplotlib uses a non-interactive backend before any import
    exec("import matplotlib; matplotlib.use('Agg')", namespace)  # noqa: S102

    for execution_count, cell in enumerate(nb.cells, start=1):
        if cell.cell_type != "code":
            continue

        cell.outputs = []
        cell.execution_count = execution_count

        stdout_buf = io.StringIO()
        stderr_buf = io.StringIO()

        try:
            with redirect_stdout(stdout_buf), redirect_stderr(stderr_buf):
                exec(cell.source, namespace)  # noqa: S102

            # Capture any matplotlib figures produced by this cell
            try:
                import matplotlib.pyplot as plt

                for fig_num in list(plt.get_fignums()):
                    fig = plt.figure(fig_num)
                    if not _figure_has_content(fig):
                        continue
                    try:
                        buf = io.BytesIO()
                        fig.savefig(buf, format="png", bbox_inches="tight")
                        img_b64 = base64.b64encode(buf.getvalue()).decode()
                        cell.outputs.append(
                            nbformat.v4.new_output(
                                output_type="display_data",
                                data={"image/png": img_b64, "text/plain": "<Figure>"},
                                metadata={},
                            ),
                        )
                    except Exception as fig_exc:  # noqa: BLE001
                        cell.outputs.append(
                            nbformat.v4.new_output(
                                output_type="error",
                                ename=type(fig_exc).__name__,
                                evalue=str(fig_exc),
                                traceback=tb.format_exception(
                                    type(fig_exc),
                                    fig_exc,
                                    fig_exc.__traceback__,
                                ),
                            ),
                        )
                plt.close("all")
            except ImportError:
                pass

        except Exception as exc:  # noqa: BLE001
            cell.outputs.append(
                nbformat.v4.new_output(
                    output_type="error",
                    ename=type(exc).__name__,
                    evalue=str(exc),
                    traceback=tb.format_exception(type(exc), exc, exc.__traceback__),
                ),
            )

        stdout_val = stdout_buf.getvalue()
        stderr_val = stderr_buf.getvalue()

        if stdout_val:
            cell.outputs.append(
                nbformat.v4.new_output(
                    output_type="stream",
                    name="stdout",
                    text=stdout_val,
                ),
            )
        if stderr_val:
            cell.outputs.append(
                nbformat.v4.new_output(
                    output_type="stream",
                    name="stderr",
                    text=stderr_val,
                ),
            )


NOTEBOOK_TEMPLATE = (
    Path(__file__).parent.parent / "notebooks" / "cluster_detail_wazp_y6.ipynb"
)


def _inject_notebook_variables(nb, replacements):
    for cell in nb.cells:
        source = cell.source
        for key, value in replacements.items():
            source = source.replace(f"{{{{{key}}}}}", value)
        cell.source = source


class TableRegistrationError(Exception):
    """Raised when table registration fails"""


class TableDeletePermissionError(PermissionError):
    """Raised when a user tries to delete a table without permission"""

    def __init__(self):
        super().__init__("You do not have permission to delete this table.")


class TableAlreadyExistsError(TableRegistrationError):
    """Raised when attempting to register an existing table"""

    def __init__(self, schema, name):
        super().__init__(f"Table {schema}.{name} already registered")


class MissingRelatedTableError(TableRegistrationError):
    """Raised when required related table is missing"""

    def __init__(self):
        super().__init__("Related table must be provided for cluster catalogs.")


class SchemaViewSet(ModelViewSet):
    serializer_class = SchemaSerializer
    queryset = Schema.objects.all()

    @action(detail=True, methods=["get"])
    def tables(self, request, pk=None):
        schema = self.get_object()
        tables = schema.tables.all()
        serializer = TableSerializer(tables, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TableViewSet(ModelViewSet):
    serializer_class = TableSerializer
    queryset = Table.objects.all()

    @action(detail=True, methods=["get"])
    def columns(self, request, pk=None):
        table = self.get_object()
        columns = table.columns.all().order_by("name")
        serializer = ColumnSerializer(columns, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ColumnViewSet(ModelViewSet):
    serializer_class = ColumnSerializer
    queryset = Column.objects.all()
    filterset_fields = ["id", "table", "table__name", "name"]


class SettingsViewSet(ModelViewSet):
    serializer_class = SettingsSerializer
    queryset = Settings.objects.all()
    filterset_fields = ["id", "table"]


class UserTableViewSet(ModelViewSet):
    serializer_class = NestedTableSerializer
    queryset = Table.objects.all()
    filterset_fields = ["id", "schema__name", "name"]
    ordering_fields = [
        "id",
        "title",
        "name",
        "schema__name",
        "created_at",
        "updated_at",
        "nrows",
    ]
    ordering = ["-created_at"]

    def list(self, request):
        # https://www.cdrf.co/3.9/rest_framework.viewsets/ReadOnlyModelViewSet.html#list
        queryset = self.get_queryset()
        queryset = queryset.filter(
            schema__owner=self.request.user,
            is_completed=True,
            is_removed=False,
            catalog_type__in=[Table.CATALOG_TYPE_TARGET, Table.CATALOG_TYPE_CLUSTER],
        )
        queryset = self.filter_queryset(queryset)

        # MyDB instance
        db = MyDB(username=request.user.username)
        # List of tables in the database that the user has access to
        db_tables = db.get_user_tables()

        # Checks if any registered table has been deleted from the database.
        to_exclude = [table.name for table in queryset if table.name not in db_tables]

        # Mark the records as removed and remove them from the result.
        if len(to_exclude) > 0:
            queryset = queryset.exclude(name__in=to_exclude)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def is_table_registered(self, tablename, schema):
        # check if the table is registered
        return Table.objects.filter(name=tablename, schema__name=schema).exists()

    def register_table(self, user, data):
        # Instancia do MyDB
        db = MyDB(username=user.username)
        # TODO: Verificar a permissão do usuario sobre a tabela

        is_registered = self.is_table_registered(
            data.get("name"),
            data.get("schema"),
        )
        if is_registered:
            raise TableAlreadyExistsError(data.get("schema"), data.get("name"))

        # Verifica se a tabela existe
        if not db.table_exists(
            schema=data.get("schema"),
            tablename=data.get("name"),
        ):
            table_name = f"{data.get('schema')}.{data.get('name')}"
            msg = f"Table {table_name} not found in database"
            raise TableRegistrationError(msg)

        # Tamanho da tabela e quantidade de linhas estimadas.
        stats = db.get_table_status(
            tablename=data.get("name"),
        )

        # Tenta usar o total de linhas estimado pelo postgres
        # para evitar a query count que pode ser demorada em tabelas grandes.
        nrows = stats.get("row_estimate")

        if nrows in (0, None, -1):
            # Total de linhas na tabela.
            nrows = db.get_count(
                tablename=data.get("name"),
            )

        schema = Schema.objects.get_or_create(
            owner=user,
            name=data.get("schema"),
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
        columns = db.describe_table(tablename=table.name)
        for c in columns:
            Column.objects.create(
                table=table,
                name=c.get("name"),
                datatype=str(c.get("type").__repr__()),
                pythontype=str(c.get("python_type").__name__),
                order=c.get("order"),
            )

        table.refresh_from_db()

        return table

    def register(self, user, data):
        # Register main table
        table = self.register_table(user, data)

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

                    if self.is_table_registered(table_name, schema_name):
                        # Related table already registered, fetch it
                        related_table = Table.objects.get(
                            name=table_name,
                            schema__name=schema_name,
                            schema__owner=user,
                        )
                        table.related_table = related_table
                        table.save()

                    else:
                        # Related table not registered,
                        # register it now
                        data = {
                            "schema": schema_name,
                            "name": table_name,
                            "title": f"Auto registered {table_name}",
                            "description": "",
                            "catalog_type": Table.CATALOG_TYPE_MEMBER,
                        }

                        related_table = self.register_table(user, data)
                        table.related_table = related_table
                        table.save()
            # endregion
        except Exception:
            if table:
                table.delete()
            raise

        table.refresh_from_db()
        return table

    def create(self, request):
        try:
            data = {
                "schema": request.data.get("schema"),
                "name": request.data.get("name"),
                "title": request.data.get("title"),
                "description": request.data.get("description"),
                "catalog_type": request.data.get("catalog_type"),
                "related_table_name": request.data.get("related_table_name", None),
            }

            table = self.register(request.user, data)

            table.refresh_from_db()

            data = self.get_serializer(instance=table).data
            return Response(data, status=status.HTTP_201_CREATED)

        except Exception as e:  # noqa: BLE001
            content = {"error": str(e)}
            return Response(content, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        instance = self.get_object()

        # Check if the table is typed as 'cluster' and has related_table set
        if instance.catalog_type == Table.CATALOG_TYPE_CLUSTER:
            related_tablename = request.data.get("related_table_name", None)

            if not instance.related_table and not related_tablename:
                return Response(
                    {"error": "Related table must be provided for cluster catalogs."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # region Register related table if not registered
            if related_tablename:
                schema_name = related_tablename.split(".")[0]
                table_name = related_tablename.split(".")[-1]

                if self.is_table_registered(table_name, schema_name):
                    # Related table already registered, fetch it
                    related_table = Table.objects.get(
                        name=table_name,
                        schema__name=schema_name,
                        schema__owner=request.user,
                    )
                    instance.related_table = related_table
                    instance.save()

                else:
                    # Related table not registered,
                    # register it now
                    try:
                        data = {
                            "schema": schema_name,
                            "name": table_name,
                            "title": f"Auto registered {table_name}",
                            "description": "",
                            "catalog_type": Table.CATALOG_TYPE_MEMBER,
                        }

                        table = self.register_table(request.user, data)
                        instance.related_table = table
                        instance.save()
                    except TableRegistrationError as e:
                        return Response(
                            {"error": f"Failed when register related table. {e}"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
            # endregion

        instance.refresh_from_db()
        data = self.get_serializer(instance=instance).data
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def mydb_tables(self, request, pk=None):
        db = MyDB(username=request.user.username)

        tables = db.get_user_tables()
        results = [
            {"table": table, "schema": db.schema}
            for table in tables
            if not self.is_table_registered(table, db.schema)
        ]

        # Order by tablename
        results.sort(key=lambda x: x["table"].lower())
        return Response(results, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def pending_registration(self, request):
        user = request.user
        table = Table.objects.filter(
            schema__owner=user,
            is_completed=False,
            catalog_type__in=[
                Table.CATALOG_TYPE_TARGET,
                Table.CATALOG_TYPE_CLUSTER,
            ],  # Type members are always completed
        ).first()
        if table:
            data = self.get_serializer(instance=table).data
            return Response(data, status=status.HTTP_200_OK)

        return Response({}, status=status.HTTP_200_OK)

    def check_mandatory_ucds(self, table_ucds, required_ucds):
        """Verifica se todos os UCDs
        obrigatórios estão presentes e têm colunas válidas.
        """
        missing = []
        for ucd in required_ucds:
            column = table_ucds.get(ucd)
            if not column:  # vazio, None ou não existe
                missing.append(ucd)
        return missing

    @action(detail=True, methods=["post"])
    def complete_registration(self, request, pk=None):
        table = self.get_object()

        # Check if table have related table when is a cluster catalog
        if table.catalog_type == Table.CATALOG_TYPE_CLUSTER:
            if not table.related_table:
                return Response(
                    {"error": "Related table must be set for cluster catalogs."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check if related table have all required UCDs assigned
            related_ucds = self.get_table_ucds(table.related_table)
            missing = self.check_mandatory_ucds(
                related_ucds,
                Table.RELATED_REQUIRED_UCDS,
            )
            if len(missing) > 0:
                return Response(
                    {
                        "error": "Related table is missing mandatory UCDs.",
                        "missing_ucds": missing,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Related table ok must be marked as completed
            table.related_table.is_completed = True
            table.related_table.save()

        # Check if all mandatory UCDs are assigned
        table_ucds = self.get_table_ucds(table)
        missing = self.check_mandatory_ucds(table_ucds, Table.REQUIRED_UCDS)
        if len(missing) > 0:
            return Response(
                {
                    "error": "Table is missing mandatory UCDs.",
                    "missing_ucds": missing,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        table.is_completed = True
        table.save()

        table.refresh_from_db()
        data = self.get_serializer(instance=table).data
        return Response(data, status=status.HTTP_200_OK)

    def get_table_ucds(self, table):
        columns = table.columns.filter(ucd__isnull=False)
        return {c.ucd: c.name for c in columns if c.ucd and c.name}

    def parse_filters(self, query_params):
        reserved_keys = ["page", "pageSize", "columns", "ordering"]
        filters = {
            key: value
            for key, value in query_params.items()
            if key not in reserved_keys
        }
        if len(filters.keys()) == 0:
            return None
        return filters

    def perform_destroy(self, instance):
        if instance.schema.owner != self.request.user:
            raise TableDeletePermissionError

        if instance.related_table:
            instance.related_table.delete()

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def sanitize_rows(self, data, bigint_columns=None):
        return sanitize_data(data, bigint_columns)

    def query_data(  # noqa: PLR0913
        self,
        table,
        limit,
        offset,
        url_filters,
        ordering,
        ucds,
    ):
        db = MyDB(username=self.request.user.username)
        rows, count = db.query(
            tablename=table.name,
            limit=limit,
            offset=offset,
            url_filters=url_filters,
            ordering=ordering,
        )

        # match the column names with the table columns ucd
        for row in rows:
            row.update(
                {
                    "meta_catalog_id": table.id,
                    "meta_id": _meta_field(row.get(ucds.get("meta.id;meta.main"))),
                    "meta_ra": _meta_field(row.get(ucds.get("pos.eq.ra;meta.main"))),
                    "meta_dec": _meta_field(row.get(ucds.get("pos.eq.dec;meta.main"))),
                    "meta_radius_arcmin": _sanitize_scalar(
                        row.get(ucds.get("phys.angSize;src")),
                    ),
                },
            )

        # Convert bigints to string to avoid JS issues
        bigint_columns = []
        for col in table.columns.all().order_by("name"):
            datatype = col.datatype.lower().split("(")[0]
            if datatype in ["bigint", "int8"]:
                bigint_columns.append(col.name)

        parsed_rows = self.sanitize_rows(rows, bigint_columns)
        return parsed_rows, count

    @action(detail=True, methods=["get"])
    def data(self, request, pk=None):
        # IMPORTANTE: Não pode ser utilizado o self.get_object()
        # por que falha se um dos campos de filtro for "id"
        # pk é a identificação que vem na url /{pk}/data/
        # e não é afetada pelos filtros.
        queryset = self.get_queryset()
        table = queryset.prefetch_related("columns").get(pk=pk)

        ucds = self.get_table_ucds(table)

        # Total de linhas estimado da tabela.
        count = table.nrows

        # Pagination parameters
        page = int(request.query_params.get("page", 1))
        page_size = request.query_params.get(
            "pageSize",
            int(settings.REST_FRAMEWORK["PAGE_SIZE"]),
        )

        limit = int(page_size)
        offset = (limit * page) - limit

        # TODO: selecionar as colunas que serao utilizadas.

        # Parse Filters
        url_filters = self.parse_filters(request.query_params)

        ordering = request.query_params.get("ordering", None)

        parsed_rows, count = self.query_data(
            table=table,
            limit=limit,
            offset=offset,
            url_filters=url_filters,
            ordering=ordering,
            ucds=ucds,
        )

        results = {
            "results": parsed_rows,
            "count": count,
            "has_more": (offset + limit) < count,
        }

        return Response(results, status=status.HTTP_200_OK)

    def _prepare_cluster_notebook(self, request, pk):
        queryset = self.get_queryset()
        main_table = queryset.prefetch_related("columns").get(pk=pk)

        main_table_metadata = NestedTableSerializer(
            main_table,
            context={"request": request},
        ).data

        ucds = self.get_table_ucds(main_table)
        url_filters = self.parse_filters(request.query_params)

        main_record, _ = self.query_data(
            table=main_table,
            limit=1,
            offset=0,
            url_filters=url_filters,
            ordering=None,
            ucds=ucds,
        )
        if len(main_record) != 1:
            return None, Response(
                {"error": "Record not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        main_record = main_record[0]
        related_table_metadata = None
        related_table_data = []

        if main_table.catalog_type == Table.CATALOG_TYPE_CLUSTER:
            if not main_table.related_table:
                return None, Response(
                    {"error": "Related table must be set for cluster catalogs."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            related_table_metadata = NestedTableSerializer(
                main_table.related_table,
                context={"request": request},
            ).data

            cross_id_property = main_table_metadata.get("related_property_id")
            related_filters = {
                cross_id_property: main_record[main_table_metadata.get("property_id")],
            }

            related_table_data, _count = self.query_data(
                table=main_table.related_table,
                limit=None,
                offset=0,
                url_filters=related_filters,
                ordering=None,
                ucds=related_table_metadata.get("ucds"),
            )

        with NOTEBOOK_TEMPLATE.open() as f:
            nb = nbformat.read(f, as_version=4)

        cluster_id = main_record.get("meta_id") or main_record.get("id") or "unknown"

        replacements = {
            "cluster_id": str(cluster_id),
            "main_table_metadata": json.dumps(
                main_table_metadata,
                allow_nan=False,
            ),
            "main_record": json.dumps(main_record, allow_nan=False),
            "related_table_metadata": json.dumps(
                related_table_metadata,
                allow_nan=False,
            ),
            "related_table_data": json.dumps(
                related_table_data,
                allow_nan=False,
            ),
        }
        _inject_notebook_variables(nb, replacements)

        context = {
            "main_record": main_record,
            "related_table_data": related_table_data,
            "notebook": nb,
        }
        return context, None

    @action(detail=True, methods=["get"])
    def notebook(self, request, pk=None):
        """Execute cluster analysis notebook and return rendered HTML."""

        context, error_response = self._prepare_cluster_notebook(request, pk)
        if error_response:
            return error_response

        nb = context["notebook"]
        _execute_notebook_inprocess(nb)

        display_nb = _notebook_for_display(nb)
        exporter = HTMLExporter()
        exporter.exclude_input = True
        exporter.exclude_input_prompt = True
        exporter.exclude_output_prompt = True
        html, _ = exporter.from_notebook_node(display_nb)

        return Response({"html": html}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="notebook/download")
    def notebook_download(self, request, pk=None):
        """Download cluster analysis notebook with hardcoded injected data."""

        context, error_response = self._prepare_cluster_notebook(request, pk)
        if error_response:
            return error_response

        nb = context["notebook"]
        cluster_id = (
            context["main_record"].get("meta_id")
            or context["main_record"].get("id")
            or "cluster"
        )

        content = nbformat.writes(nb)
        response = HttpResponse(content, content_type="application/x-ipynb")
        response["Content-Disposition"] = (
            f'attachment; filename="cluster_{cluster_id}_analysis.ipynb"'
        )
        return response
