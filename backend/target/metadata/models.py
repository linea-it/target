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
    is_public = models.BooleanField(
        default=False,
        verbose_name=_("Is Public"),
        help_text=_(
            "Indicates whether this schema is visible to every authenticated "
            "user, not just its owner.",
        ),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("order", "name")
        unique_together = ("owner", "name")

        verbose_name = _("Schema")
        verbose_name_plural = _("Schemas")

    def __str__(self):
        return self.name


class Table(models.Model):
    CATALOG_TYPE_TARGET = "target"
    CATALOG_TYPE_CLUSTER = "cluster"
    CATALOG_TYPE_MEMBER = "member"

    CATALOG_TYPE_CHOICES = (
        (CATALOG_TYPE_TARGET, _("target")),
        (CATALOG_TYPE_CLUSTER, _("cluster")),
        (CATALOG_TYPE_MEMBER, _("member")),
    )

    REQUIRED_UCDS = [
        "meta.id;meta.main",
        "pos.eq.ra;meta.main",
        "pos.eq.dec;meta.main",
    ]

    RELATED_REQUIRED_UCDS = [
        "meta.id;meta.main",
        "pos.eq.ra;meta.main",
        "pos.eq.dec;meta.main",
        "meta.id.cross",
    ]

    # Columns added by Canvas to every registered table so users can
    # evaluate the quality of each record. Reserved names: registration
    # fails if the user's table already has a column with one of these
    # names. Kept out of the Column metadata catalog on purpose.
    RESERVED_ANNOTATION_COLUMNS = {
        "meta_quality_flag": "boolean",
        "meta_comment": "text",
    }

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
    catalog_type = models.CharField(
        max_length=10,
        choices=CATALOG_TYPE_CHOICES,
        default=CATALOG_TYPE_TARGET,
        verbose_name=_("Type of table"),
        help_text=_(
            "Identifies whether the table represents a list of targets or clusters",
        ),
    )
    is_completed = models.BooleanField(
        verbose_name=_("Is Completed"),
        help_text=_("Indicates whether the record is completed or not."),
        default=False,
    )
    is_removed = models.BooleanField(
        verbose_name=_("Is Removed"),
        help_text=_("Indicates whether the record is marked as removed or not."),
        default=False,
    )

    # campo de relação com a própria tabela
    related_table = models.ForeignKey(
        "self",  # referência ao próprio modelo
        null=True,  # pode ficar vazio
        blank=True,
        on_delete=models.SET_NULL,  # evita cascata (não apaga a tabela pai)
        related_name="related_members",  # nome reverso mais claro
        verbose_name=_("Related Table"),
        help_text=_("Members table for tables with type cluster."),
    )

    # Reservado para a Fase 2 (catálogos públicos): aponta para a tabela
    # pública original da qual esta tabela foi derivada (subset materializado
    # em mydb_<username> via TAP). Não usado ainda.
    source_table = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="derived_tables",
        verbose_name=_("Source Table"),
        help_text=_(
            "Public table this table was derived/materialized from, if any.",
        ),
    )

    DIAGNOSTIC_STATUS_PENDING = "pending"
    DIAGNOSTIC_STATUS_RUNNING = "running"
    DIAGNOSTIC_STATUS_DONE = "done"
    DIAGNOSTIC_STATUS_ERROR = "error"
    DIAGNOSTIC_STATUS_CHOICES = (
        (DIAGNOSTIC_STATUS_PENDING, _("pending")),
        (DIAGNOSTIC_STATUS_RUNNING, _("running")),
        (DIAGNOSTIC_STATUS_DONE, _("done")),
        (DIAGNOSTIC_STATUS_ERROR, _("error")),
    )

    catalog_diagnostic_status = models.CharField(
        max_length=10,
        choices=DIAGNOSTIC_STATUS_CHOICES,
        blank=True,
        default="",
        verbose_name=_("Diagnostic Status"),
        help_text=_("Status of the catalog diagnostic notebook generation."),
    )
    catalog_diagnostic_html = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Diagnostic HTML"),
        help_text=_("Pre-rendered HTML of the catalog diagnostic notebook."),
    )
    catalog_diagnostic_notebook = models.FileField(
        upload_to="catalog_diagnostics/%Y/%m/",
        blank=True,
        null=True,
        verbose_name=_("Diagnostic Notebook"),
        help_text=_("Executed notebook (.ipynb) for download."),
    )
    catalog_diagnostic_error = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Diagnostic Error"),
        help_text=_("Error message if diagnostic generation failed."),
    )
    catalog_diagnostic_updated_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Diagnostic Updated At"),
        help_text=_("Last time the diagnostic was generated or updated."),
    )

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
    pythontype = models.CharField(
        max_length=255,
        verbose_name=_("Python Type"),
        help_text=_("Data type of the column in python."),
        blank=True,
        default="",
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


class Settings(models.Model):
    table = models.OneToOneField(
        Table,
        related_name="settings",
        on_delete=models.CASCADE,
        verbose_name=_("Table"),
        help_text=_("Table to which the settings belongs."),
    )

    default_image = models.CharField(
        verbose_name=_("Default Image"),
        help_text=_("Default image to be used in target preview."),
        max_length=255,
        blank=True,
        default="DES_DR2_IRG_LIneA",
    )

    default_fov = models.FloatField(
        verbose_name=_("Default FOV"),
        help_text=_("Default field of view to be used in target preview."),
        blank=True,
        default=1.5,
    )

    default_marker_size = models.FloatField(
        verbose_name=_("Default Marker Size"),
        help_text=_("Default marker size to be used in target preview."),
        blank=True,
        default=0.001,
    )

    class Meta:
        verbose_name = _("Settings")
        verbose_name_plural = _("Settings")

    def __str__(self):
        return f"{self.table.schema.name}.{self.table.name}.settings"


class MaterializationJob(models.Model):
    """Tracks one "filter a public catalog -> materialize as my own table"
    request (issue #197): a Celery task submits the filtered query to
    Daiquiri's TAP service, polls it, and auto-registers the resulting
    table(s) - the same materialization it starts. filter_model is kept
    for audit/retry even after the job finishes.
    """

    STATUS_PENDING = "pending"
    STATUS_RUNNING = "running"
    STATUS_DONE = "done"
    STATUS_ERROR = "error"
    STATUS_CHOICES = (
        (STATUS_PENDING, _("pending")),
        (STATUS_RUNNING, _("running")),
        (STATUS_DONE, _("done")),
        (STATUS_ERROR, _("error")),
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="materialization_jobs",
        on_delete=models.CASCADE,
        verbose_name=_("Owner"),
        help_text=_("User who requested the materialization."),
    )
    source_table = models.ForeignKey(
        Table,
        related_name="materialization_jobs",
        on_delete=models.CASCADE,
        verbose_name=_("Source Table"),
        help_text=_("Public catalog table being filtered."),
    )
    filter_model = models.JSONField(
        verbose_name=_("Filter Model"),
        help_text=_(
            "Raw MUI DataGrid filterModel used to build the SQL sent to Daiquiri.",
        ),
    )
    result_table_name = models.CharField(
        max_length=255,
        verbose_name=_("Result Table Name"),
        help_text=_(
            "Auto-generated name of the materialized table in the user's mydb.",
        ),
    )
    related_result_table_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name=_("Related Result Table Name"),
        help_text=_(
            "Auto-generated name of the materialized members table, "
            "for cluster catalogs.",
        ),
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        verbose_name=_("Status"),
    )
    error = models.TextField(
        blank=True,
        default="",
        verbose_name=_("Error"),
        help_text=_("Error message if the job failed."),
    )
    daiquiri_job_id_primary = models.CharField(
        max_length=64,
        blank=True,
        default="",
        verbose_name=_("Daiquiri Job Id (primary)"),
    )
    daiquiri_job_id_related = models.CharField(
        max_length=64,
        blank=True,
        default="",
        verbose_name=_("Daiquiri Job Id (related)"),
        help_text=_("Only set for cluster catalogs, once the primary job succeeds."),
    )
    result_table = models.ForeignKey(
        Table,
        related_name="+",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name=_("Result Table"),
        help_text=_(
            "The Table row created once materialization + auto-registration succeed.",
        ),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = _("Materialization Job")
        verbose_name_plural = _("Materialization Jobs")

    def __str__(self):
        return f"{self.owner.username}:{self.source_table}:{self.status}"
