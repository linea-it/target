from rest_framework import status
from rest_framework.decorators import action
from rest_framework.mixins import ListModelMixin
from rest_framework.mixins import RetrieveModelMixin
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework.viewsets import ModelViewSet

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


class UserTableViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    serializer_class = NestedTableSerializer
    queryset = Table.objects.all()

    def get_queryset(self):
        user = self.request.user
        return Table.objects.filter(schema__owner=user)
