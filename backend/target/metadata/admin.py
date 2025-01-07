from django.contrib import admin

from .models import Column
from .models import Schema
from .models import Table


@admin.register(Schema)
class SchemaAdmin(admin.ModelAdmin):
    search_fields = ["name"]
    list_display = ["name", "owner", "order", "created_at", "updated_at"]


@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    search_fields = ["name"]
    list_display = [
        "name",
        "schema",
        "title",
        "description",
        "order",
        "nrows",
        "size",
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
