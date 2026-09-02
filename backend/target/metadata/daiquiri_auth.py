"""Mints the short-lived service JWT Canvas uses to call Daiquiri's TAP API
on behalf of a user (see lsp_daiquiri's linea.authentication.ServiceJWTAuthentication,
which validates this exact token shape on the other side).
"""

import time

import jwt
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

SERVICE_JWT_AUDIENCE = "daiquiri-tap"
SERVICE_JWT_ISSUER = "canvas"
SERVICE_JWT_ALGORITHM = "HS256"
SERVICE_JWT_TTL_SECONDS = 5 * 60


def mint_service_token(username):
    """Returns a signed JWT identifying `username` to Daiquiri.

    Daiquiri never creates a user from this token - it only resolves an
    already existing local user with the same username, so the caller is
    responsible for knowing that account exists on both sides.
    """
    secret = settings.DAIQUIRI_SERVICE_JWT_SECRET
    if not secret:
        msg = "DAIQUIRI_SERVICE_JWT_SECRET is not configured."
        raise ImproperlyConfigured(msg)

    now = int(time.time())
    claims = {
        "sub": username,
        "iat": now,
        "exp": now + SERVICE_JWT_TTL_SECONDS,
        "aud": SERVICE_JWT_AUDIENCE,
        "iss": SERVICE_JWT_ISSUER,
    }
    return jwt.encode(claims, secret, algorithm=SERVICE_JWT_ALGORITHM)
