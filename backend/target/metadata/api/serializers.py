from rest_framework import serializers

from target.metadata.models import Column
from target.metadata.models import Schema
from target.metadata.models import Settings
from target.metadata.models import Table


# https://mui.com/x/react-data-grid/column-definition/#column-types
def python_type_to_mui_column_type(pythontype):
    if pythontype in ["int", "float"]:
        return "number"
    if pythontype == "bool":
        return "boolean"

    # TODO: Handle other types like datetime, etc.

    # Default to string for all other types
    return "string"


class ColumnSerializer(serializers.ModelSerializer[Column]):
    # Represents the column type in a format suitable for MUI DataGrid
    mui_column_type = serializers.SerializerMethodField()

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
            "mui_column_type",
            "order",
            "created_at",
            "updated_at",
        ]

    # Convert the Python type to a MUI DataGrid column type
    def get_mui_column_type(self, obj):
        return python_type_to_mui_column_type(obj.pythontype)


class ResumedColumnSerializer(serializers.ModelSerializer[Column]):
    # Represents the column type in a format suitable for MUI DataGrid
    muicolumntype = serializers.SerializerMethodField()

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
            "muicolumntype",
            "order",
        ]

    # Convert the Python type to a MUI DataGrid column type
    def get_muicolumntype(self, obj):
        return python_type_to_mui_column_type(obj.pythontype)


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


class SettingsSerializer(serializers.ModelSerializer[Settings]):
    class Meta:
        model = Settings
        fields = [
            "id",
            "table",
            "default_image",
            "default_fov",
            "default_marker_size",
        ]
        read_only_fields = ["id", "table"]


class NestedTableSerializer(serializers.ModelSerializer[Table]):
    qs_columns = Table.objects.prefetch_related("columns")
    columns = ResumedColumnSerializer(qs_columns, many=True, read_only=True)

    qs_settings = Table.objects.prefetch_related("settings")
    settings = SettingsSerializer(qs_settings, many=False, read_only=True)

    owner = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
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
            "is_owner",
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
            "settings",
        ]

    def get_owner(self, obj):
        return obj.schema.owner.username

    def get_is_owner(self, obj):
        current_user = self.context["request"].user
        return obj.schema.owner.pk == current_user.pk

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
