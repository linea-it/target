from django.conf import settings
from rest_framework.routers import DefaultRouter
from rest_framework.routers import SimpleRouter

from target.metadata.api.views import ColumnViewSet
from target.metadata.api.views import SchemaViewSet
from target.metadata.api.views import SettingsViewSet
from target.metadata.api.views import TableViewSet
from target.metadata.api.views import UserTableViewSet
from target.users.api.views import UserViewSet

router = DefaultRouter() if settings.DEBUG else SimpleRouter()

router.register("users", UserViewSet)
router.register("metadata/schemas", SchemaViewSet)
router.register("metadata/tables", TableViewSet)
router.register("metadata/columns", ColumnViewSet)
router.register("metadata/settings", SettingsViewSet, basename="settings")
router.register("metadata/user_tables", UserTableViewSet, basename="user_tables")


app_name = "api"
urlpatterns = router.urls
