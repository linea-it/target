from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Schema(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="schemas",
        on_delete=models.CASCADE,
        verbose_name=_("Owner"),
        help_text=_("User who owns the schema."),
    )
    name = models.CharField(
        max_length=255,
        verbose_name=_("Name"),
        help_text=_("Name of the schema on the database server."),
    )
    order = models.IntegerField(
        default=0,
        verbose_name=_("Order"),
        help_text=_("Order in which the schema should be displayed."),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("order", "name")

        verbose_name = _("Schema")
        verbose_name_plural = _("Schemas")

    def __str__(self):
        return self.name


class Table(models.Model):
    schema = models.ForeignKey(
        Schema,
        related_name="tables",
        on_delete=models.CASCADE,
        verbose_name=_("Schema"),
        help_text=_("Schema to which the table belongs."),
    )
    name = models.CharField(
        max_length=255,
        verbose_name=_("Name"),
        help_text=_("Name of the table on the database server."),
    )
    title = models.CharField(
        max_length=255,
        verbose_name=_("Title"),
        help_text=_("Human readable title of the table."),
    )
    description = models.TextField(
        verbose_name=_("Description"),
        help_text=_(
            "A brief description of the table to be displayed in the user interface.",
        ),
        blank=True,
        default="",
    )
    order = models.IntegerField(
        default=0,
        verbose_name=_("Order"),
        help_text=_("Order in which the table should be displayed."),
    )
    nrows = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Rows"),
        help_text=_("Number of rows in the table."),
    )
    size = models.BigIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Size"),
        help_text=_("Size of the table in bytes."),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("schema__order", "order", "name")

        verbose_name = _("Table")
        verbose_name_plural = _("Tables")

    def __str__(self):
        return f"{self.schema.name}.{self.name}"


class Column(models.Model):
    table = models.ForeignKey(
        Table,
        related_name="columns",
        on_delete=models.CASCADE,
        verbose_name=_("Table"),
        help_text=_("Table to which the column belongs."),
    )
    name = models.CharField(
        max_length=255,
        verbose_name=_("Name"),
        help_text=_("Name of the column on the database server."),
    )
    title = models.CharField(
        max_length=255,
        verbose_name=_("Title"),
        help_text=_("Human readable title of the column."),
        blank=True,
        default="",
    )
    description = models.TextField(
        verbose_name=_("Description"),
        help_text=_(
            "A brief description of the column to be displayed in the user interface.",
        ),
        blank=True,
        default="",
    )
    unit = models.CharField(
        max_length=255,
        verbose_name=_("Unit"),
        help_text=_("Unit of the column."),
        blank=True,
        default="",
    )
    ucd = models.CharField(
        max_length=255,
        verbose_name=_("UCD"),
        help_text=_("IVOA UCDs. Unified Content Descriptor of the column."),
        blank=True,
        default="",
    )
    datatype = models.CharField(
        max_length=255,
        verbose_name=_("Type"),
        help_text=_("Data type of the column."),
    )
    order = models.IntegerField(
        default=0,
        verbose_name=_("Order"),
        help_text=_("Order in which the column should be displayed."),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("table__schema__order", "table__order", "order", "name")

        verbose_name = _("Column")
        verbose_name_plural = _("Columns")

    def __str__(self):
        return f"{self.table.schema.name}.{self.table.name}.{self.name}"
