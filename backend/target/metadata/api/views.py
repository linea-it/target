from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from dblinea import MyDB
from target.metadata.models import Column
from target.metadata.models import Schema
from target.metadata.models import Settings
from target.metadata.models import Table
from target.metadata.notebook_utils import _meta_field
from target.metadata.notebook_utils import _notebook_to_ipynb_string
from target.metadata.notebook_utils import _prepare_cluster_notebook
from target.metadata.notebook_utils import _render_notebook_html
from target.metadata.notebook_utils import _sanitize_scalar
from target.metadata.notebook_utils import sanitize_data
from target.metadata.tasks import generate_catalog_diagnostic

from .serializers import ColumnSerializer
from .serializers import NestedTableSerializer
from .serializers import SchemaSerializer
from .serializers import SettingsSerializer
from .serializers import TableSerializer


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


class ReservedColumnConflictError(TableRegistrationError):
    """Raised when the user's table already has a column name reserved by Canvas"""

    def __init__(self, columns):
        cols = ", ".join(sorted(columns))
        super().__init__(
            "Table already has column(s) reserved for Canvas annotations: "
            f"{cols}. Please rename them in Daiquiri before registering.",
        )


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

    def ensure_annotation_columns(self, db, tablename):
        """Garante que a tabela do usuário tenha as colunas reservadas
        para avaliação (meta_quality_flag, meta_comment).

        Aborta caso a tabela já tenha uma coluna com um desses nomes,
        para evitar sobrescrever silenciosamente uma coluna do usuário
        com semântica diferente.
        """
        existing_columns = set(db.get_table_columns(tablename))
        conflicts = existing_columns & set(Table.RESERVED_ANNOTATION_COLUMNS)
        if conflicts:
            raise ReservedColumnConflictError(conflicts)

        db.add_columns(tablename, Table.RESERVED_ANNOTATION_COLUMNS)

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

        # Garante as colunas de avaliação (meta_quality_flag, meta_comment)
        # antes de ler o schema da tabela, para que já apareçam no describe.
        self.ensure_annotation_columns(db, data.get("name"))

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
        # As colunas reservadas para avaliação (meta_quality_flag,
        # meta_comment) ficam de fora do catálogo de Column: não aparecem
        # no grid nem no mapeamento de UCDs, apenas fluem "de graça" nas
        # linhas retornadas por MyDB.query() (SELECT *).
        columns = db.describe_table(tablename=table.name)
        for c in columns:
            if c.get("name") in Table.RESERVED_ANNOTATION_COLUMNS:
                continue
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

        # Trigger catalog diagnostic generation for cluster catalogs.
        if table.catalog_type == Table.CATALOG_TYPE_CLUSTER:
            table.catalog_diagnostic_status = Table.DIAGNOSTIC_STATUS_PENDING
            table.save(update_fields=["catalog_diagnostic_status"])
            # on_commit: só dispara a task após o commit da transação do
            # request (ATOMIC_REQUESTS), garantindo que o worker leia o
            # estado já persistido (ex.: is_completed=True).
            transaction.on_commit(
                lambda: generate_catalog_diagnostic.delay(table.id),
            )

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

    def _validate_annotation_payload(self, data):
        """Valida o payload de anotação e retorna {coluna_fisica: valor}.

        Lança ValueError com a mensagem de erro caso o payload seja inválido.
        """
        values = {}

        if "quality_flag" in data:
            quality_flag = data.get("quality_flag")
            if quality_flag is not None and not isinstance(quality_flag, bool):
                msg = "quality_flag must be a boolean or null."
                raise ValueError(msg)
            values["meta_quality_flag"] = quality_flag

        if "comment" in data:
            comment = data.get("comment")
            if comment is not None and not isinstance(comment, str):
                msg = "comment must be a string or null."
                raise ValueError(msg)
            values["meta_comment"] = comment

        if not values:
            msg = "Provide at least one of: quality_flag, comment."
            raise ValueError(msg)

        return values

    @action(
        detail=True,
        methods=["patch"],
        url_path=r"rows/(?P<row_id>[^/.]+)/annotation",
    )
    def annotation(self, request, pk=None, row_id=None):
        """Grava a avaliação de qualidade (meta_quality_flag) e/ou o
        comentário (meta_comment) de uma linha da tabela do usuário.

        Body: {"quality_flag": true|false|null, "comment": "..."|null}
        Ao menos um dos dois campos deve ser enviado.
        """
        table = get_object_or_404(self.get_queryset(), pk=pk)

        if table.schema.owner != request.user:
            return Response(
                {"error": "You do not have permission to annotate this table."},
                status=status.HTTP_403_FORBIDDEN,
            )

        id_column = self.get_table_ucds(table).get("meta.id;meta.main")
        if not id_column:
            return Response(
                {
                    "error": "Table is missing the mandatory id column "
                    "(meta.id;meta.main) required to annotate rows.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            values = self._validate_annotation_payload(request.data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        db = MyDB(username=request.user.username)
        try:
            updated = db.update_row(
                tablename=table.name,
                id_column=id_column,
                id_value=row_id,
                values=values,
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if updated == 0:
            return Response(
                {"error": f"Row {row_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        response_data = {"row_id": row_id}
        if "meta_quality_flag" in values:
            response_data["quality_flag"] = values["meta_quality_flag"]
        if "meta_comment" in values:
            response_data["comment"] = values["meta_comment"]

        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def notebook(self, request, pk=None):
        """Execute cluster analysis notebook and return rendered HTML."""

        # Não usar self.get_object(): o filtro "id" colide com o
        # query param ?id=<cluster> usado para selecionar o cluster.
        table = self.get_queryset().get(pk=pk)
        context, error_response = _prepare_cluster_notebook(table, request, self)
        if error_response:
            return Response(
                error_response,
                status=error_response.get("status", status.HTTP_400_BAD_REQUEST),
            )

        html = _render_notebook_html(context["notebook"])
        return Response({"html": html}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="notebook/download")
    def notebook_download(self, request, pk=None):
        """Download cluster analysis notebook with hardcoded injected data."""

        # Não usar self.get_object(): o filtro "id" colide com o
        # query param ?id=<cluster> usado para selecionar o cluster.
        table = self.get_queryset().get(pk=pk)
        context, error_response = _prepare_cluster_notebook(table, request, self)
        if error_response:
            return Response(
                error_response,
                status=error_response.get("status", status.HTTP_400_BAD_REQUEST),
            )

        cluster_id = (
            context["main_record"].get("meta_id")
            or context["main_record"].get("id")
            or "cluster"
        )

        content = _notebook_to_ipynb_string(context["notebook"])
        response = HttpResponse(content, content_type="application/x-ipynb")
        response["Content-Disposition"] = (
            f'attachment; filename="cluster_{cluster_id}_analysis.ipynb"'
        )
        return response

    @action(detail=True, methods=["get"], url_path="catalog_diagnostic")
    def catalog_diagnostic(self, request, pk=None):
        """Return pre-rendered catalog diagnostic HTML if available."""

        table = self.get_object()
        if table.catalog_type != Table.CATALOG_TYPE_CLUSTER or not table.related_table:
            return Response(
                {"error": "Diagnostic is only available for CAnVAS cluster catalogs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "html": table.catalog_diagnostic_html,
                "status": table.catalog_diagnostic_status,
                "error": table.catalog_diagnostic_error,
                "updated_at": table.catalog_diagnostic_updated_at,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="catalog_diagnostic/download")
    def catalog_diagnostic_download(self, request, pk=None):
        """Download pre-rendered catalog diagnostic notebook."""

        table = self.get_object()
        if table.catalog_type != Table.CATALOG_TYPE_CLUSTER or not table.related_table:
            return Response(
                {"error": "Diagnostic is only available for CAnVAS cluster catalogs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not table.catalog_diagnostic_notebook:
            return Response(
                {"error": "Diagnostic notebook not available."},
                status=status.HTTP_404_NOT_FOUND,
            )

        response = HttpResponse(
            table.catalog_diagnostic_notebook.read(),
            content_type="application/x-ipynb",
        )
        filename = table.catalog_diagnostic_notebook.name.split("/")[-1]
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=["post"], url_path="catalog_diagnostic/regenerate")
    def catalog_diagnostic_regenerate(self, request, pk=None):
        """Re-trigger catalog diagnostic generation."""

        table = self.get_object()
        if table.catalog_type != Table.CATALOG_TYPE_CLUSTER or not table.related_table:
            return Response(
                {"error": "Diagnostic is only available for CAnVAS cluster catalogs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        table.catalog_diagnostic_status = Table.DIAGNOSTIC_STATUS_PENDING
        table.save(update_fields=["catalog_diagnostic_status"])
        generate_catalog_diagnostic.delay(table.id)

        return Response(
            {"status": table.catalog_diagnostic_status},
            status=status.HTTP_202_ACCEPTED,
        )
