
from django.conf import settings
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


class TableRegistrationError(Exception):
    """Raised when table registration fails"""

    pass


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
        columns = table.columns.all()
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
            raise TableRegistrationError(f"Table {table_name} not found in database")

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
                    raise MissingRelatedTableError()

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

        except Exception as e:
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
        """Verifica se todos os UCDs obrigatórios estão presentes e têm colunas válidas."""
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
                related_ucds, Table.RELATED_REQUIRED_UCDS
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
            raise TableDeletePermissionError()

        if instance.related_table:
            instance.related_table.delete()

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def data(self, request, pk=None):
        # print("-----------------------------")

        # IMPORTANTE: Não pode ser utilizado o self.get_object()
        # por que falha se um dos campos de filtro for "id"
        # pk é a identificação que vem na url /{pk}/data/
        # e não é afetada pelos filtros.
        queryset = self.get_queryset()
        table = queryset.get(pk=pk)

        # print(table)
        ucds = self.get_table_ucds(table)
        # print(ucds)

        # Total de linhas estimado da tabela.
        count = table.nrows

        # Pagination parameters
        page = int(request.query_params.get("page", 1))
        page_size = request.query_params.get(
            "pageSize",
            int(settings.REST_FRAMEWORK["PAGE_SIZE"]),
        )
        # print("Page: ", page)
        # print("Page Size: ", page_size)

        limit = int(page_size)
        offset = (limit * page) - limit

        # print("Offset: ", offset)
        # print("Limit: ", limit)

        # # TODO: selecionar as colunas que serao utilizadas.
        # columns = request.query_params.get("columns", "")
        # columns = columns.split(",")

        # Parse Filters
        url_filters = self.parse_filters(request.query_params)
        # print("Filters: ", url_filters)

        ordering = request.query_params.get("ordering", None)

        db = MyDB(username=request.user.username)
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
                    "meta_id": row.get(ucds.get("meta.id;meta.main")),
                    "meta_ra": row.get(ucds.get("pos.eq.ra;meta.main")),
                    "meta_dec": row.get(ucds.get("pos.eq.dec;meta.main")),
                    "meta_radius_arcmin": row.get(ucds.get("phys.angSize;src")),
                },
            )

        results = {
            "results": rows,
            "count": count,
            "has_more": (offset + limit) < count,
        }

        return Response(results, status=status.HTTP_200_OK)
