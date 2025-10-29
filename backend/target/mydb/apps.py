from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class MydbConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'target.mydb'
    verbose_name = _("MyDB")
