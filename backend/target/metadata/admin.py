from django.contrib import admin

from .models import Column
from .models import Schema
from .models import Settings
from .models import Table


@admin.register(Schema)
class SchemaAdmin(admin.ModelAdmin):
    search_fields = ["name"]
    list_display = ["id", "name", "owner", "order", "created_at", "updated_at"]


@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    search_fields = ["name"]
    list_display = [
        "id",
        "name",
        "schema",
        "title",
        # "description",
        "order",
        "nrows",
        "size",
        "catalog_type",
        "related_table",
        "is_removed",
        "is_completed",
        "created_at",
        "updated_at",
    ]


@admin.register(Column)
class ColumnAdmin(admin.ModelAdmin):
    search_fields = ["name"]
    list_display = [
        "table",
        "name",
        "title",
        "unit",
        "ucd",
        "datatype",
        "order",
        "description",
        "created_at",
        "updated_at",
    ]


@admin.register(Settings)
class SettingsAdmin(admin.ModelAdmin):
    list_display = [
        "table",
        "default_image",
        "default_fov",
        "default_marker_size",
    ]
