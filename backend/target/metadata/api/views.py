import re

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone as django_timezone
from rest_framework import mixins
from rest_framework import permissions
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework.viewsets import ModelViewSet

from dblinea import MyDB
from target.metadata.annotation import ReservedColumnConflictError
from target.metadata.annotation import TableNotInDatabaseError
from target.metadata.annotation import ensure_annotation_columns_lazy
from target.metadata.catalog_admin import PublicSchemaPermissionError
from target.metadata.catalog_admin import TableManagePermissionError
from target.metadata.catalog_admin import TableRegistrationError
from target.metadata.catalog_admin import can_manage_table
from target.metadata.catalog_admin import is_table_registered
from target.metadata.catalog_admin import register
from target.metadata.catalog_admin import register_table
from target.metadata.catalog_admin import resolve_schema_owner
from target.metadata.filter_to_sql import FilterToSqlError
from target.metadata.filter_to_sql import build_select_sql
from target.metadata.models import Column
from target.metadata.models import MaterializationJob
from target.metadata.models import Schema
from target.metadata.models import Settings
from target.metadata.models import Table
from target.metadata.notebook_utils import _meta_field
from target.metadata.notebook_utils import _notebook_to_ipynb_string
from target.metadata.notebook_utils import _prepare_cluster_notebook
from target.metadata.notebook_utils import _render_notebook_html
from target.metadata.notebook_utils import _sanitize_scalar
from target.metadata.notebook_utils import sanitize_data
from target.metadata.public_catalogs import PUBLIC_CATALOGS
from target.metadata.tasks import generate_catalog_diagnostic
from target.metadata.tasks import run_materialization_job

from .serializers import ColumnSerializer
from .serializers import MaterializationJobSerializer
from .serializers import NestedTableSerializer
from .serializers import SchemaSerializer
from .serializers import SettingsSerializer
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
        columns = table.columns.all().order_by("name")
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


# Base name only - "_members" (8 chars) may still be appended for the
# cluster+members case, so this is capped well under Postgres's 63-byte
# identifier limit.
RESULT_TABLE_NAME_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,49}$")


def _validate_result_table_name(name, *, owner_username):
    """Returns an error message if `name` can't be used as a materialized
    table name, or None if it's fine. Checked synchronously at request time
    (rather than left to fail inside the Celery task) so the user gets
    immediate feedback instead of a job that silently ends up in `error`.
    """
    if not RESULT_TABLE_NAME_RE.match(name):
        return (
            "Table name must start with a letter or underscore, contain only "
            "letters, digits and underscores, and be at most 50 characters."
        )
    schema_name = f"{settings.USER_SCHEMA_PREFIX}{owner_username}"
    if is_table_registered(name, schema_name):
        return f"You already have a table named '{name}'."
    return None


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

    def get_permissions(self):
        if self.action in ("public_schemas", "registrable_schema_tables"):
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    def _get_reader_db(self, table):
        if table.schema.is_public:
            return MyDB(schema=table.schema.name)
        return MyDB(username=self.request.user.username)

    def _owned_or_public_queryset(self):
        """Tables the current user may *read*: their own, or any public
        schema's - regardless of completion state, since edit/complete
        flows (update/complete_registration) need to reach an in-progress
        registration too. Excludes soft-removed rows.

        This is the single source of truth for read-visibility, used by
        get_object() (so retrieve/update/complete_registration/destroy all
        get it "for free") and by any detail action that deliberately
        avoids self.get_object() (see data(), which predates this helper
        and has its own reason to bypass filter_queryset).
        """
        return self.get_queryset().filter(
            Q(schema__owner=self.request.user) | Q(schema__is_public=True),
            is_removed=False,
        )

    def _listable_queryset(self):
        """Narrower than _owned_or_public_queryset(): only tables that
        belong on a catalog listing/grid - completed, not removed, and of
        a browsable type. Used by list() and by anything that treats a
        table as a materialization source (filter_preview/materialize),
        since a source table must already be a real, navigable catalog.
        """
        return self._owned_or_public_queryset().filter(
            is_completed=True,
            catalog_type__in=[Table.CATALOG_TYPE_TARGET, Table.CATALOG_TYPE_CLUSTER],
        )

    def get_object(self):
        # Deliberately does not use self.filter_queryset() here (unlike the
        # DRF default) - same reason data() avoids it: filterset_fields
        # would apply query params like ?id=... on top of the pk lookup,
        # which can 404 a legitimate request. See data()'s comment below.
        queryset = self._owned_or_public_queryset()
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        obj = get_object_or_404(queryset, **filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj

    def list(self, request):
        # https://www.cdrf.co/3.9/rest_framework.viewsets/ReadOnlyModelViewSet.html#list
        queryset = self._listable_queryset()
        queryset = self.filter_queryset(queryset)

        # List of tables in the user's own schema.
        own_tables = set(MyDB(username=request.user.username).get_user_tables())

        # List of tables in each distinct public schema present in the result.
        public_schema_names = {t.schema.name for t in queryset if t.schema.is_public}
        public_tables_by_schema = {
            name: set(MyDB(schema=name).get_user_tables())
            for name in public_schema_names
        }

        def _exists_in_db(t):
            if t.schema.is_public:
                return t.name in public_tables_by_schema.get(t.schema.name, set())
            return t.name in own_tables

        # Checks if any registered table has been deleted from the database.
        to_exclude = [table.id for table in queryset if not _exists_in_db(table)]

        # Mark the records as removed and remove them from the result.
        if len(to_exclude) > 0:
            queryset = queryset.exclude(id__in=to_exclude)

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
                "name": request.data.get("name"),
                "title": request.data.get("title"),
                "description": request.data.get("description"),
                "catalog_type": request.data.get("catalog_type"),
                "related_table_name": request.data.get("related_table_name", None),
            }

            table = register(request.user, data)

            table.refresh_from_db()

            data = self.get_serializer(instance=table).data
            return Response(data, status=status.HTTP_201_CREATED)

        except PublicSchemaPermissionError as e:
            content = {"error": str(e)}
            return Response(content, status=status.HTTP_403_FORBIDDEN)

        except Exception as e:  # noqa: BLE001
            content = {"error": str(e)}
            return Response(content, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, *args, **kwargs):
        # Checagem no backend: o gate can_manage do frontend (Settings só
        # acessível pro dono real ou staff em schema público) não é uma
        # fronteira de segurança sozinho — qualquer cliente autenticado
        # pode chamar PATCH/PUT direto sabendo só o id da tabela.
        if not can_manage_table(request.user, self.get_object()):
            raise TableManagePermissionError

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

                if is_table_registered(table_name, schema_name):
                    # Related table already registered, fetch it
                    related_owner, _is_public = resolve_schema_owner(
                        request.user,
                        schema_name,
                    )
                    related_table = Table.objects.get(
                        name=table_name,
                        schema__name=schema_name,
                        schema__owner=related_owner,
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

                        table = register_table(request.user, data)
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
            if not is_table_registered(table, db.schema)
        ]

        # Order by tablename
        results.sort(key=lambda x: x["table"].lower())
        return Response(results, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def public_schemas(self, request):
        return Response(sorted(PUBLIC_CATALOGS.keys()), status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def registrable_schema_tables(self, request):
        schema = request.query_params.get("schema")
        allowed_tables = set(PUBLIC_CATALOGS.get(schema, []))
        if not allowed_tables:
            return Response(
                {"error": "Unknown or unauthorized schema."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        db = MyDB(schema=schema)
        live_tables = set(db.get_user_tables())
        results = [
            {"table": t, "schema": schema}
            for t in sorted(allowed_tables & live_tables)
            if not is_table_registered(t, schema)
        ]
        return Response(results, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def pending_registration(self, request):
        user = request.user

        # Schema.owner de um catálogo público é sempre o usuário de sistema
        # (Decisão 1), nunca o admin que o está registrando de fato — por
        # isso staff também precisa ver pendências em schemas públicos,
        # não só as suas próprias.
        visibility = Q(schema__owner=user)
        if user.is_staff:
            visibility |= Q(schema__is_public=True)

        table = Table.objects.filter(
            visibility,
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
        """Verifica se todos os UCDs
        obrigatórios estão presentes e têm colunas válidas.
        """
        missing = []
        for ucd in required_ucds:
            column = table_ucds.get(ucd)
            if not column:  # vazio, None ou não existe
                missing.append(ucd)
        return missing

    @action(detail=True, methods=["post"])
    def complete_registration(self, request, pk=None):
        table = self.get_object()
        if not can_manage_table(request.user, table):
            raise TableManagePermissionError

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
                related_ucds,
                Table.RELATED_REQUIRED_UCDS,
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

        # Trigger catalog diagnostic generation for cluster catalogs.
        if table.catalog_type == Table.CATALOG_TYPE_CLUSTER:
            table.catalog_diagnostic_status = Table.DIAGNOSTIC_STATUS_PENDING
            table.save(update_fields=["catalog_diagnostic_status"])
            # on_commit: só dispara a task após o commit da transação do
            # request (ATOMIC_REQUESTS), garantindo que o worker leia o
            # estado já persistido (ex.: is_completed=True).
            transaction.on_commit(
                lambda: generate_catalog_diagnostic.delay(table.id),
            )

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
        if not can_manage_table(self.request.user, instance):
            raise TableManagePermissionError

        if instance.related_table:
            instance.related_table.delete()

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def sanitize_rows(self, data, bigint_columns=None):
        return sanitize_data(data, bigint_columns)

    def query_data(  # noqa: PLR0913
        self,
        table,
        limit,
        offset,
        url_filters,
        ordering,
        ucds,
    ):
        db = self._get_reader_db(table)
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
                    "meta_id": _meta_field(row.get(ucds.get("meta.id;meta.main"))),
                    "meta_ra": _meta_field(row.get(ucds.get("pos.eq.ra;meta.main"))),
                    "meta_dec": _meta_field(row.get(ucds.get("pos.eq.dec;meta.main"))),
                    "meta_radius_arcmin": _sanitize_scalar(
                        row.get(ucds.get("phys.angSize;src")),
                    ),
                },
            )

        # Convert bigints to string to avoid JS issues
        bigint_columns = []
        for col in table.columns.all().order_by("name"):
            datatype = col.datatype.lower().split("(")[0]
            if datatype in ["bigint", "int8"]:
                bigint_columns.append(col.name)

        parsed_rows = self.sanitize_rows(rows, bigint_columns)
        return parsed_rows, count

    @action(detail=True, methods=["get"])
    def data(self, request, pk=None):
        # IMPORTANTE: Não pode ser utilizado o self.get_object()
        # por que falha se um dos campos de filtro for "id"
        # pk é a identificação que vem na url /{pk}/data/
        # e não é afetada pelos filtros. Usa _owned_or_public_queryset()
        # (não self.get_queryset() puro) para não deixar um usuário
        # autenticado ler dados de tabela privada de outro usuário só por
        # saber o id.
        queryset = self._owned_or_public_queryset()
        table = get_object_or_404(queryset.prefetch_related("columns"), pk=pk)

        # Self-healing: garante as colunas de avaliação mesmo em tabelas
        # registradas antes dessa feature existir, ou se a tabela tiver
        # sido recriada no Daiquiri depois do registro no Canvas. Tabelas
        # públicas não têm meta_quality_flag/meta_comment (schema externo
        # compartilhado, sem anotação pessoal), então pula essa checagem.
        if not table.schema.is_public:
            db = MyDB(username=request.user.username)
            try:
                ensure_annotation_columns_lazy(db, table)
            except TableNotInDatabaseError as e:
                return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
            except ReservedColumnConflictError as e:
                return Response({"error": str(e)}, status=status.HTTP_409_CONFLICT)

        ucds = self.get_table_ucds(table)

        # Total de linhas estimado da tabela.
        count = table.nrows

        # Pagination parameters
        page = int(request.query_params.get("page", 1))
        page_size = request.query_params.get(
            "pageSize",
            int(settings.REST_FRAMEWORK["PAGE_SIZE"]),
        )

        limit = int(page_size)
        offset = (limit * page) - limit

        # TODO: selecionar as colunas que serao utilizadas.

        # Parse Filters
        url_filters = self.parse_filters(request.query_params)

        ordering = request.query_params.get("ordering", None)

        parsed_rows, count = self.query_data(
            table=table,
            limit=limit,
            offset=offset,
            url_filters=url_filters,
            ordering=ordering,
            ucds=ucds,
        )

        results = {
            "results": parsed_rows,
            "count": count,
            "has_more": (offset + limit) < count,
        }

        return Response(results, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="filter_preview")
    def filter_preview(self, request, pk=None):
        # Same visibility rule as list()/data(): a materialization source
        # must be a real, browsable catalog table (own or public), not just
        # any row readable via _owned_or_public_queryset().
        table = get_object_or_404(self._listable_queryset(), pk=pk)

        filter_model = request.data.get("filter_model") or {}
        try:
            sql = build_select_sql(table, filter_model)
        except FilterToSqlError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"sql": sql}, status=status.HTTP_200_OK)

    def _validate_annotation_payload(self, data):
        """Valida o payload de anotação e retorna {coluna_fisica: valor}.

        Lança ValueError com a mensagem de erro caso o payload seja inválido.
        """
        values = {}

        if "quality_flag" in data:
            quality_flag = data.get("quality_flag")
            if quality_flag is not None and not isinstance(quality_flag, bool):
                msg = "quality_flag must be a boolean or null."
                raise ValueError(msg)
            values["meta_quality_flag"] = quality_flag

        if "comment" in data:
            comment = data.get("comment")
            if comment is not None and not isinstance(comment, str):
                msg = "comment must be a string or null."
                raise ValueError(msg)
            values["meta_comment"] = comment

        if not values:
            msg = "Provide at least one of: quality_flag, comment."
            raise ValueError(msg)

        return values

    def _prepare_annotation_target(self, request, table):
        """Garante que a tabela esteja pronta para receber anotações
        (colunas existentes, self-healing se preciso) e resolve a coluna
        real de id.

        Returns:
            (db, id_column, error_response). error_response é None quando
            tudo ok; nesse caso db/id_column já podem ser usados. Quando
            error_response não é None, db e id_column são None e o
            chamador deve retornar error_response diretamente.
        """
        db = MyDB(username=request.user.username)
        try:
            ensure_annotation_columns_lazy(db, table)
        except TableNotInDatabaseError as e:
            return (
                None,
                None,
                Response(
                    {"error": str(e)},
                    status=status.HTTP_404_NOT_FOUND,
                ),
            )
        except ReservedColumnConflictError as e:
            return (
                None,
                None,
                Response(
                    {"error": str(e)},
                    status=status.HTTP_409_CONFLICT,
                ),
            )

        id_column = self.get_table_ucds(table).get("meta.id;meta.main")
        if not id_column:
            return (
                None,
                None,
                Response(
                    {
                        "error": "Table is missing the mandatory id column "
                        "(meta.id;meta.main) required to annotate rows.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                ),
            )

        return db, id_column, None

    @action(
        detail=True,
        methods=["patch"],
        url_path=r"rows/(?P<row_id>[^/.]+)/annotation",
    )
    def annotation(self, request, pk=None, row_id=None):
        """Grava a avaliação de qualidade (meta_quality_flag) e/ou o
        comentário (meta_comment) de uma linha da tabela do usuário.

        Body: {"quality_flag": true|false|null, "comment": "..."|null}
        Ao menos um dos dois campos deve ser enviado.
        """
        table = get_object_or_404(self.get_queryset(), pk=pk)

        if table.schema.owner != request.user:
            return Response(
                {"error": "You do not have permission to annotate this table."},
                status=status.HTTP_403_FORBIDDEN,
            )

        db, id_column, error_response = self._prepare_annotation_target(request, table)
        if error_response:
            return error_response

        try:
            values = self._validate_annotation_payload(request.data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            updated = db.update_row(
                tablename=table.name,
                id_column=id_column,
                id_value=row_id,
                values=values,
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if updated == 0:
            return Response(
                {"error": f"Row {row_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        response_data = {"row_id": row_id}
        if "meta_quality_flag" in values:
            response_data["quality_flag"] = values["meta_quality_flag"]
        if "meta_comment" in values:
            response_data["comment"] = values["meta_comment"]

        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def notebook(self, request, pk=None):
        """Execute cluster analysis notebook and return rendered HTML."""

        # Não usar self.get_object(): o filtro "id" colide com o
        # query param ?id=<cluster> usado para selecionar o cluster.
        table = self.get_queryset().get(pk=pk)
        context, error_response = _prepare_cluster_notebook(table, request, self)
        if error_response:
            return Response(
                error_response,
                status=error_response.get("status", status.HTTP_400_BAD_REQUEST),
            )

        html = _render_notebook_html(context["notebook"])
        return Response({"html": html}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="notebook/download")
    def notebook_download(self, request, pk=None):
        """Download cluster analysis notebook with hardcoded injected data."""

        # Não usar self.get_object(): o filtro "id" colide com o
        # query param ?id=<cluster> usado para selecionar o cluster.
        table = self.get_queryset().get(pk=pk)
        context, error_response = _prepare_cluster_notebook(table, request, self)
        if error_response:
            return Response(
                error_response,
                status=error_response.get("status", status.HTTP_400_BAD_REQUEST),
            )

        cluster_id = (
            context["main_record"].get("meta_id")
            or context["main_record"].get("id")
            or "cluster"
        )

        content = _notebook_to_ipynb_string(context["notebook"])
        response = HttpResponse(content, content_type="application/x-ipynb")
        response["Content-Disposition"] = (
            f'attachment; filename="cluster_{cluster_id}_analysis.ipynb"'
        )
        return response

    @action(detail=True, methods=["get"], url_path="catalog_diagnostic")
    def catalog_diagnostic(self, request, pk=None):
        """Return pre-rendered catalog diagnostic HTML if available."""

        table = self.get_object()
        if table.catalog_type != Table.CATALOG_TYPE_CLUSTER or not table.related_table:
            return Response(
                {"error": "Diagnostic is only available for CAnVAS cluster catalogs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "html": table.catalog_diagnostic_html,
                "status": table.catalog_diagnostic_status,
                "error": table.catalog_diagnostic_error,
                "updated_at": table.catalog_diagnostic_updated_at,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="catalog_diagnostic/download")
    def catalog_diagnostic_download(self, request, pk=None):
        """Download pre-rendered catalog diagnostic notebook."""

        table = self.get_object()
        if table.catalog_type != Table.CATALOG_TYPE_CLUSTER or not table.related_table:
            return Response(
                {"error": "Diagnostic is only available for CAnVAS cluster catalogs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not table.catalog_diagnostic_notebook:
            return Response(
                {"error": "Diagnostic notebook not available."},
                status=status.HTTP_404_NOT_FOUND,
            )

        response = HttpResponse(
            table.catalog_diagnostic_notebook.read(),
            content_type="application/x-ipynb",
        )
        filename = table.catalog_diagnostic_notebook.name.split("/")[-1]
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=["post"], url_path="catalog_diagnostic/regenerate")
    def catalog_diagnostic_regenerate(self, request, pk=None):
        """Re-trigger catalog diagnostic generation."""

        table = self.get_object()
        if not can_manage_table(request.user, table):
            raise TableManagePermissionError

        if table.catalog_type != Table.CATALOG_TYPE_CLUSTER or not table.related_table:
            return Response(
                {"error": "Diagnostic is only available for CAnVAS cluster catalogs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        table.catalog_diagnostic_status = Table.DIAGNOSTIC_STATUS_PENDING
        table.save(update_fields=["catalog_diagnostic_status"])
        generate_catalog_diagnostic.delay(table.id)

        return Response(
            {"status": table.catalog_diagnostic_status},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["post"])
    def materialize(self, request, pk=None):
        """Filters `pk` (a public/own catalog table) by `filter_model` and
        materializes the result as a new table in the caller's own mydb,
        via a background MaterializationJob (issue #197). `pk` is always
        the *source* table. `table_name` is the name the user wants for the
        result table; if omitted, one is auto-generated.
        """
        table = get_object_or_404(self._listable_queryset(), pk=pk)

        in_progress = MaterializationJob.objects.filter(
            owner=request.user,
            source_table=table,
            status__in=[
                MaterializationJob.STATUS_PENDING,
                MaterializationJob.STATUS_RUNNING,
            ],
        ).exists()
        if in_progress:
            return Response(
                {"error": "A materialization for this table is already in progress."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        filter_model = request.data.get("filter_model") or {}
        requested_name = (request.data.get("table_name") or "").strip()

        if requested_name:
            error = _validate_result_table_name(
                requested_name,
                owner_username=request.user.username,
            )
            if error:
                return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
            result_table_name = requested_name
        else:
            timestamp = django_timezone.now().strftime("%Y%m%d%H%M%S")
            result_table_name = f"{table.name}_subset_{timestamp}"

        related_result_table_name = ""
        if table.catalog_type == Table.CATALOG_TYPE_CLUSTER and table.related_table:
            related_result_table_name = f"{result_table_name}_members"
            if requested_name:
                error = _validate_result_table_name(
                    related_result_table_name,
                    owner_username=request.user.username,
                )
                if error:
                    return Response(
                        {"error": f"Members table name: {error}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        job = MaterializationJob.objects.create(
            owner=request.user,
            source_table=table,
            filter_model=filter_model,
            result_table_name=result_table_name,
            related_result_table_name=related_result_table_name,
        )
        # on_commit: garante que o worker só veja o job depois que a
        # transação do request tiver sido persistida (mesmo padrão de
        # catalog_diagnostic_regenerate/complete_registration).
        transaction.on_commit(lambda: run_materialization_job.delay(job.id))

        return Response(
            {"id": job.id, "status": job.status},
            status=status.HTTP_202_ACCEPTED,
        )


class MaterializationJobViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    GenericViewSet,
):
    """Read-only: status polling for a user's own materialization jobs.
    Never exposes another user's jobs - there's no public-schema concept
    here, unlike UserTableViewSet's visibility rule.
    """

    serializer_class = MaterializationJobSerializer

    def get_queryset(self):
        return MaterializationJob.objects.filter(owner=self.request.user)
