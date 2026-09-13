from django.conf import settings
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from dblinea import MyDB


def get_mydb_quota(username):
    """Quota usage for `username`'s mydb schema. Free function (not a
    MydbViewSet method) so it can be called from the materialization Celery
    task (target.metadata.tasks) without a request/viewset context.
    """
    db = MyDB(username=username)

    quota_mb = settings.MYDB_QUOTA_MB
    quota_bytes = quota_mb * 1024 * 1024

    used_bytes = db.total_size_tables()

    return {
        "quota_bytes": quota_bytes,
        "used_bytes": used_bytes,
        "available_bytes": max(quota_bytes - used_bytes, 0),
    }


class MydbViewSet(viewsets.ViewSet):
    def list(self, request):
        """
        GET /api/mydb/ - Lista todas as tabelas no schema do usuario
        """

        user = request.user

        try:
            # MyDB instance
            db = MyDB(username=user.username)

            # Executa o ANALYZE nas tabelas que não possuem estatísticas
            # Previne que informações como rowcount fiquem zeradas
            # IMPORTANTE: Isso pode levar algum tempo dependendo do número de tabelas
            db.analyze_tables_without_stats()

            # List of tables in the database that the user has access to
            tables = db.get_user_tables_detailed()
            count = len(tables)

            # Sorting
            ordering = request.GET.get("ordering")
            if ordering:
                reverse = ordering.startswith("-")
                field_name = ordering.lstrip("-")
                tables.sort(key=lambda x: x.get(field_name), reverse=reverse)

            # Pagination
            page = int(request.GET.get("page", 1))
            page_size = int(request.GET.get("pageSize", 10))

            start = (page - 1) * page_size
            end = start + page_size
            tables = tables[start:end]

            # Get quota information
            quota = get_mydb_quota(user.username)

            return Response(
                {
                    "count": count,
                    "results": tables,
                    "quota": quota,
                },
            )

        except Exception as e:  # noqa: BLE001
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request, pk=None):
        """
        GET /api/mydb/<table_name>/ - Busca item específico
        """
        if pk is None:
            return Response(
                {"error": "Table name is mandatory"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            table_name = pk
            user = request.user

            # MyDB instance
            db = MyDB(username=user.username)

            # List of tables in the database that the user has access to
            tables = db.get_user_tables_detailed()

            items = [table for table in tables if table["table_name"] == table_name]

            if len(items) == 1:
                return Response(items[0])
            return Response(
                {"error": f"Table {table_name} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError:
            return Response(
                {"error": f"internal error table name {table_name} not found"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request, pk=None):
        """
        DELETE /api/mydb/<table_name>/ - Remove item
        """
        if pk is None:
            return Response(
                {"error": "Table name is mandatory"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            table_name = pk
            user = request.user

            # MyDB instance
            db = MyDB(username=user.username)

            # List of tables in the database that the user has access to
            tables = db.get_user_tables_detailed()

            items = [table for table in tables if table["table_name"] == table_name]

            if len(items) != 1:
                return Response(
                    {"error": f"Table {table_name} not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Drop the table
            db.drop_user_table(table_name)

            return Response(
                {"message": f"Table {table_name} dropped successfully"},
                status=status.HTTP_200_OK,
            )
        except ValueError:
            return Response(
                {"error": "Failed to remove the table."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # === CUSTOM ACTIONS ===
    @action(detail=False, methods=["get"])
    def quota(self, request):
        """
        GET /api/mydb/quota/ - Informações sobre a cota do usuário.
        """
        user = request.user

        try:
            quota = get_mydb_quota(user.username)
            return Response(quota)

        except Exception as e:  # noqa: BLE001
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
