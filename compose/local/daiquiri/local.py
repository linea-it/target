# the hostname and port number of the current Server
BASE_HOST = "http://localhost"

# A list of strings representing the host/domain names that this Django site can serve.
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "::1", "*"]

# Public URL of the Daiquiri site. Used for VO and OAI metadata.
# Default: http://localhost:8000
SITE_URL = "http://localhost"

# Identifier for the Daiquiri site. Usually the URL without the protocol. Used for VO and OAI metadata.
# Default: None
SITE_IDENTIFIER = "localhost"

# The title for the Daiquiri site. Used for VO and OAI metadata.
# Default: None
SITE_TITLE = "LIneA TAP Service"

# The description for the Daiquiri site. Used for VO and OAI metadata.
# Default: None
SITE_DESCRIPTION = "The TAP Service registry for linea.org.br"

# A license for the Daiquiri site.
# See https://github.com/django-daiquiri/daiquiri/blob/master/daiquiri/core/constants.py for the available choices. Used in various metadata fields.
# Default: None
SITE_LICENSE = None

# Creator of the Daiquiri site. Used in the VO registry entry. Has to be of the following form:
# Default: None
SITE_CREATOR = "LIneA"
SITE_LOGO_URL = "https://scienceserver.linea.org.br/favicon.png"

# List of contacts for the Daiquiri site. Used in the VO registry entry. Has to be of the following form:
# Default: None
SITE_CONTACT = {
    "name": "LIneA Helpdesk",
    "address": "Rio de Janeiro, Brasil",
    "email": "helpdesk@linea.org.br",
    "telephone": "",
}

# Publisher of the Daiquiri site. Used for VO and OAI metadata.
# Default: None
SITE_PUBLISHER = "LIneA - Laboratório Interinstitucional de e-Astronomia"

# Date of the creation of the Daiquiri site. Used for VO and OAI metadata. Has to be of the form
# Default: None
SITE_CREATED = "2023-04-19"

# Date of the last update of the Daiquiri site. Used for VO and OAI metadata. Has to be of the form
# Default: None
SITE_UPDATED = "2023-04-27"


# NAO ALTERAR: Estas variaveis estão relacionadas a rota /protected/ no ngnix.
# São necessárias para o funcionamento do Download.
# https://django-sendfile2.readthedocs.io/en/latest/backends.html#nginx-backend
SENDFILE_BACKEND = "django_sendfile.backends.nginx"
SENDFILE_ROOT = "/data/download/"
SENDFILE_URL = "/download"

# NAO ALTERAR: Esta variavel estão relacionada a rota /daiquiri_static/ no ngnix e no uWSGI.
# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.9/howto/static-files/
STATIC_URL = "/daiquiri_static/"

QUERY_DROPDOWNS = [
    {
        "key": "simbad",
        "service": "query/js/dropdowns/simbad.js",
        "template": "query/query_dropdown_simbad.html",
        "options": {"url": "https://simbad.u-strasbg.fr/simbad/sim-id"},
    },
    {
        "key": "vizier",
        "service": "query/js/dropdowns/vizier.js",
        "template": "query/query_dropdown_vizier.html",
        "options": {
            "url": "https://vizier.u-strasbg.fr/viz-bin/votable",
            "catalogs": [
                "I/322A",
                "I/259",
                "II/281",
                "II/246",
                "V/139",
                "V/147",
                "I/317",
                "II/328/allwise",
                "II/312/ais",
                "I/345",
                "I/350",
                "I/329",
                "II/349",
                "II/342",
            ],
        },
    },
]

QUERY_QUEUES = [
    {
        "key": "default",
        "label": "30 Seconds",
        "timeout": 30,
        "priority": 1,
        "access_level": "PUBLIC",
        "groups": [],
    },
    {
        "key": "five_minutes",
        "label": "5 Minutes",
        "timeout": 300,
        "priority": 2,
        "access_level": "PUBLIC",
        "groups": [],
    },
    {
        "key": "two_hours",
        "label": "Two hours",
        "timeout": 7200,
        "priority": 3,
        "access_level": "PUBLIC",
        "groups": [],
    },
]

QUERY_LANGUAGES = [
    {
        "key": "adql",
        "version": 2.0,
        "label": "ADQL",
        "description": "",
        "quote_char": '"',
    },
    {
        "key": "postgresql",
        "version": 13.9,
        "label": "PostgreSQL",
        "description": "",
        "quote_char": '"',
    },
]

# daiquiri.query.settings
# Designates if the query interface can be accessed by anonymus users.
# The permissions on schemas and tables need to be configured using the metadata interface.
# Default: False
QUERY_ANONYMOUS = True

# daiquiri.query.settings
# Sets the timeout for syncronous (TAP) queries in seconds.
# Default: 5
QUERY_SYNC_TIMEOUT = 300

# daiquiri.query.settings
# Sets the timeout for syncronous (TAP) queries in seconds.
# Default: 'daiquiri_user_'
QUERY_USER_SCHEMA_PREFIX = "mydb_"


CELERY_PIDFILE_PATH = "/tmp"
