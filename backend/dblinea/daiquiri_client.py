"""HTTP client for Daiquiri's TAP async protocol, used to materialize a
filtered subset of a public catalog table into the requesting user's mydb
(issue #197). Modeled after dblinea/scienceserver.py's ScienceServerApi
(environment dict + uniform request error handling), but authenticates with
a Canvas-minted service JWT (see target.metadata.daiquiri_auth) instead of a
static token, and sets an explicit timeout on every request.
"""

from urllib.parse import urljoin

import requests
from django.conf import settings

from target.metadata.daiquiri_auth import mint_service_token


class DaiquiriTapError(Exception):
    """Raised for any failure talking to Daiquiri's TAP service, with a
    message safe to show to the end user (never the raw DRF/HTML body).
    """


class DaiquiriTapClient:
    def __init__(self, username, base_url=None, request_timeout=None):
        self._base_url = (base_url or settings.DAIQUIRI_BASE_URL).rstrip("/") + "/"
        self._username = username
        self._request_timeout = request_timeout or settings.DAIQUIRI_JOB_POLL_TIMEOUT_S

    def _headers(self, accept=None):
        # Minted fresh per request (not cached on the instance) - a
        # materialization can poll for a long time if Daiquiri is slow to
        # pick up the job, and the service JWT's TTL (a few minutes) is
        # much shorter than that. Signing a new HS256 token is cheap.
        headers = {"Authorization": f"Bearer {mint_service_token(self._username)}"}
        if accept:
            headers["Accept"] = accept
        return headers

    def _request(self, method, path, accept=None, **kwargs):
        url = urljoin(self._base_url, path)
        try:
            response = requests.request(
                method,
                url,
                headers=self._headers(accept=accept),
                timeout=self._request_timeout,
                **kwargs,
            )
        except requests.exceptions.Timeout as exc:
            msg = f"Timed out talking to Daiquiri ({method} {path})."
            raise DaiquiriTapError(msg) from exc
        except requests.exceptions.ConnectionError as exc:
            msg = f"Could not connect to Daiquiri ({method} {path})."
            raise DaiquiriTapError(msg) from exc
        except requests.exceptions.RequestException as exc:
            msg = f"Request to Daiquiri failed ({method} {path}): {exc}"
            raise DaiquiriTapError(msg) from exc
        return response

    @staticmethod
    def _job_id_from_location(response):
        location = response.headers.get("Location")
        if not location:
            msg = "Daiquiri did not return a job location for this request."
            raise DaiquiriTapError(msg)
        # Location's host/scheme come from Daiquiri's own BASE_HOST config,
        # not necessarily reachable/correct from Canvas's side - only the
        # trailing job UUID segment is meaningful here.
        return location.rstrip("/").rsplit("/", 1)[-1]

    def submit_async_job(self, query, table_name, lang="postgresql", maxrec=None):
        """Creates an async TAP job without running it (no PHASE=RUN) - this
        is pure validation: Daiquiri parses/checks the query but nothing
        executes yet. Returns the new job's id.
        """
        data = {"QUERY": query, "LANG": lang, "TABLE_NAME": table_name}
        if maxrec is not None:
            data["MAXREC"] = maxrec

        response = self._request(
            "POST",
            "tap/async",
            data=data,
            allow_redirects=False,
        )
        if response.status_code != requests.codes.see_other:
            msg = (
                f"Daiquiri rejected the query (HTTP {response.status_code}): "
                f"{response.text[:500]}"
            )
            raise DaiquiriTapError(msg)
        return self._job_id_from_location(response)

    def run_job(self, job_id):
        """Starts execution of a previously submitted (pending) job."""
        response = self._request(
            "POST",
            f"tap/async/{job_id}/phase",
            data={"PHASE": "RUN"},
            allow_redirects=False,
        )
        if response.status_code != requests.codes.see_other:
            msg = (
                f"Daiquiri refused to run job {job_id} "
                f"(HTTP {response.status_code}): {response.text[:500]}"
            )
            raise DaiquiriTapError(msg)

    def get_job_status(self, job_id):
        """Returns the job's current state as a dict (phase, error_summary,
        table_name, schema_name, nrows, size, ...), via Daiquiri's JSON REST
        API (not the XML UWS document).
        """
        response = self._request(
            "GET",
            f"query/api/jobs/{job_id}/",
            accept="application/json",
        )
        if response.status_code != requests.codes.ok:
            msg = (
                f"Could not fetch status for job {job_id} "
                f"(HTTP {response.status_code}): {response.text[:500]}"
            )
            raise DaiquiriTapError(msg)
        return response.json()

    def submit_and_run(self, query, table_name, lang="postgresql", maxrec=None):
        """Shortcut: submit + run in one call. Returns the job id."""
        job_id = self.submit_async_job(query, table_name, lang=lang, maxrec=maxrec)
        self.run_job(job_id)
        return job_id
