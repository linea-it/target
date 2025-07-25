from django.conf import settings
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from dblinea import MyDB
from target.metadata.models import Column
from target.metadata.models import Schema
from target.metadata.models import Table

from .serializers import ColumnSerializer
from .serializers import NestedTableSerializer
from .serializers import SchemaSerializer
from .serializers import TableSerializer


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
        queryset = queryset.filter(schema__owner=self.request.user, is_completed=True)
        queryset = self.filter_queryset(queryset)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def is_table_registered(self, tablename, schema):
        # check if the table is registered
        return Table.objects.filter(name=tablename, schema__name=schema).exists()

    def create(self, request):
        try:
            data = {
                "schema": request.data.get("schema"),
                "name": request.data.get("name"),
                "title": request.data.get("title"),
                "description": request.data.get("description"),
                "catalog_type": request.data.get("catalog_type"),
            }

            # Instancia do MyDB
            db = MyDB(username=request.user.username)
            # TODO: Verificar a permissão do usuario sobre a tabela

            # TODO: Verficar se a tabela não foi registrada.
            is_registered = self.is_table_registered(
                data.get("name"),
                data.get("schema"),
            )
            if is_registered:
                raise Exception(
                    f"Table {data.get('schema')}.{data.get('name')} already registered",
                )

            # Verifica se a tabela existe
            if not db.table_exists(
                schema=data.get("schema"),
                tablename=data.get("name"),
            ):
                return Response(
                    {"message": "Table not found"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Tamanho da tabela e quantidade de linhas estimadas.
            stats = db.get_table_status(
                tablename=data.get("name"),
            )

            # Tenta usar o total de linhas estimado pelo postgres
            # para evitar a query count que pode ser demorada em tabelas grandes.
            nrows = stats.get("row_estimate")
            # print("Estimated rows: ", nrows)
            if nrows in (0, None, -1):
                # print("Estimated rows not found, using count query")
                # Total de linhas na tabela.
                nrows = db.get_count(
                    tablename=data.get("name"),
                )

            schema = Schema.objects.get_or_create(
                owner=request.user,
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

            data = self.get_serializer(instance=table).data
            return Response(data, status=status.HTTP_201_CREATED)

        except Exception as e:
            content = {"error": str(e)}
            return Response(content, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        table = Table.objects.filter(schema__owner=user, is_completed=False).first()
        if table:
            data = self.get_serializer(instance=table).data
            return Response(data, status=status.HTTP_200_OK)

        return Response({}, status=status.HTTP_200_OK)

    def get_table_ucds(self, table):
        columns = table.columns.filter(ucd__isnull=False)
        return {c.ucd: c.name for c in columns}

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

    @action(detail=True, methods=["get"])
    def data(self, request, pk=None):
        # print("-----------------------------")
        table = self.get_object()
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
                    "meta_id": row.get(ucds.get("meta.id;meta.main")),
                    "meta_ra": row.get(ucds.get("pos.eq.ra;meta.main")),
                    "meta_dec": row.get(ucds.get("pos.eq.dec;meta.main")),
                },
            )

        results = {
            "results": rows,
            "count": count,
            "has_more": (offset + limit) < count,
        }

        return Response(results, status=status.HTTP_200_OK)
