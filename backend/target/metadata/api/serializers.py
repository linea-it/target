from rest_framework import serializers

from target.metadata.models import Column
from target.metadata.models import Schema
from target.metadata.models import Table


class ColumnSerializer(serializers.ModelSerializer[Column]):
    class Meta:
        model = Column
        fields = [
            "id",
            "table",
            "name",
            "title",
            "description",
            "unit",
            "ucd",
            "datatype",
            "pythontype",
            "order",
            "created_at",
            "updated_at",
        ]


class ResumedColumnSerializer(serializers.ModelSerializer[Column]):
    class Meta:
        model = Column
        fields = [
            "id",
            "name",
            "title",
            "description",
            "unit",
            "ucd",
            "datatype",
            "pythontype",
            "order",
        ]


class TableSerializer(serializers.ModelSerializer[Table]):
    class Meta:
        model = Table
        fields = [
            "id",
            "schema",
            "name",
            "order",
            "title",
            "description",
            "order",
            "nrows",
            "size",
            "catalog_type",
            "created_at",
            "is_completed",
            "updated_at",
        ]


class SchemaSerializer(serializers.ModelSerializer[Schema]):
    class Meta:
        model = Schema
        fields = ["id", "owner", "name", "order", "created_at", "updated_at"]


class NestedTableSerializer(serializers.ModelSerializer[Table]):
    qs_columns = Table.objects.prefetch_related("columns")
    columns = ResumedColumnSerializer(qs_columns, many=True, read_only=True)

    owner = serializers.SerializerMethodField()
    schema = serializers.SerializerMethodField()
    table = serializers.SerializerMethodField()
    property_id = serializers.SerializerMethodField()
    property_ra = serializers.SerializerMethodField()
    property_dec = serializers.SerializerMethodField()

    class Meta:
        model = Table
        fields = [
            "id",
            "owner",
            "schema",
            "table",
            "order",
            "title",
            "description",
            "order",
            "nrows",
            "size",
            "catalog_type",
            "created_at",
            "updated_at",
            "is_completed",
            "property_id",
            "property_ra",
            "property_dec",
            "columns",
        ]

    def get_owner(self, obj):
        return obj.schema.owner.username

    def get_schema(self, obj):
        return obj.schema.name

    def get_table(self, obj):
        return obj.name

    def get_property_id(self, obj):
        col = obj.columns.filter(ucd="meta.id;meta.main").first()
        if col:
            return col.name
        return None

    def get_property_ra(self, obj):
        col = obj.columns.filter(ucd="pos.eq.ra;meta.main").first()
        if col:
            return col.name
        return None

    def get_property_dec(self, obj):
        col = obj.columns.filter(ucd="pos.eq.dec;meta.main").first()
        if col:
            return col.name
        return None
