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


class UserTableViewSet(ModelViewSet):
    serializer_class = NestedTableSerializer
    queryset = Table.objects.all()
    filterset_fields = ["id", "schema__name", "name"]
    ordering_fields = ["id", "name", "schema__name", "created_at", "updated_at"]
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

    def create(self, request):
        try:
            data = {
                "schema": request.data.get("schema"),
                "name": request.data.get("table"),
                "title": request.data.get("title"),
                "description": request.data.get("description"),
                "catalog_type": request.data.get("catalog_type"),
            }

            # Instancia do MyDB
            db = MyDB(username=request.user.username)

            # TODO: Verificar a permissão do usuario sobre a tabela

            # TODO: Verficar se a tabela não foi registrada.

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
            if nrows in (0, None):
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
        results = [{"table": table, "schema": db.schema} for table in tables]

        return Response(results, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def pending_registration(self, request):
        user = request.user
        table = Table.objects.filter(schema__owner=user, is_completed=False).first()
        if table:
            data = self.get_serializer(instance=table).data
            return Response(data, status=status.HTTP_200_OK)

        return Response({}, status=status.HTTP_200_OK)
