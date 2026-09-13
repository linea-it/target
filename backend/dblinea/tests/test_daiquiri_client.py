from unittest import mock

import pytest
import requests

from dblinea.daiquiri_client import DaiquiriTapClient
from dblinea.daiquiri_client import DaiquiriTapError


@pytest.fixture(autouse=True)
def _service_jwt_secret(settings):
    settings.DAIQUIRI_SERVICE_JWT_SECRET = "test-secret"  # noqa: S105 - test fixture, not a real secret
    settings.DAIQUIRI_BASE_URL = "http://daiquiri.test"


def _response(status_code, headers=None, json_body=None, text=""):
    response = mock.Mock(spec=requests.Response)
    response.status_code = status_code
    response.headers = headers or {}
    response.text = text
    if json_body is not None:
        response.json.return_value = json_body
    return response


@mock.patch("dblinea.daiquiri_client.requests.request")
def test_submit_async_job_returns_job_id_from_location(mock_request):
    mock_request.return_value = _response(
        requests.codes.see_other,
        headers={"Location": "http://daiquiri.test/tap/async/1234-5678"},
    )

    client = DaiquiriTapClient(username="someuser")
    job_id = client.submit_async_job("SELECT 1", "result_table")

    assert job_id == "1234-5678"
    called_kwargs = mock_request.call_args.kwargs
    assert called_kwargs["data"]["QUERY"] == "SELECT 1"
    assert called_kwargs["data"]["TABLE_NAME"] == "result_table"
    assert called_kwargs["headers"]["Authorization"].startswith("Bearer ")


@mock.patch("dblinea.daiquiri_client.requests.request")
def test_submit_async_job_raises_on_validation_error(mock_request):
    mock_request.return_value = _response(
        requests.codes.bad_request,
        text="Missing schema specification.",
    )

    client = DaiquiriTapClient(username="someuser")
    with pytest.raises(DaiquiriTapError, match="rejected the query"):
        client.submit_async_job("SELECT * FROM nope", "result_table")


@mock.patch("dblinea.daiquiri_client.requests.request")
def test_submit_async_job_raises_on_timeout(mock_request):
    mock_request.side_effect = requests.exceptions.Timeout

    client = DaiquiriTapClient(username="someuser")
    with pytest.raises(DaiquiriTapError, match="Timed out"):
        client.submit_async_job("SELECT 1", "result_table")


@mock.patch("dblinea.daiquiri_client.requests.request")
def test_run_job_posts_phase_run(mock_request):
    mock_request.return_value = _response(requests.codes.see_other)

    client = DaiquiriTapClient(username="someuser")
    client.run_job("1234-5678")

    called_args, called_kwargs = mock_request.call_args
    assert called_args[0] == "POST"
    assert called_args[1] == "http://daiquiri.test/tap/async/1234-5678/phase"
    assert called_kwargs["data"] == {"PHASE": "RUN"}


@mock.patch("dblinea.daiquiri_client.requests.request")
def test_get_job_status_returns_parsed_json(mock_request):
    mock_request.return_value = _response(
        requests.codes.ok,
        json_body={"phase": "ERROR", "error_summary": "boom"},
    )

    client = DaiquiriTapClient(username="someuser")
    status = client.get_job_status("1234-5678")

    assert status == {"phase": "ERROR", "error_summary": "boom"}


@mock.patch("dblinea.daiquiri_client.requests.request")
def test_get_job_status_raises_on_http_error(mock_request):
    mock_request.return_value = _response(requests.codes.not_found, text="gone")

    client = DaiquiriTapClient(username="someuser")
    with pytest.raises(DaiquiriTapError, match="Could not fetch status"):
        client.get_job_status("1234-5678")


@mock.patch("dblinea.daiquiri_client.requests.request")
def test_submit_and_run_submits_then_runs(mock_request):
    mock_request.side_effect = [
        _response(
            requests.codes.see_other,
            headers={"Location": "http://daiquiri.test/tap/async/1234-5678"},
        ),
        _response(requests.codes.see_other),
    ]

    client = DaiquiriTapClient(username="someuser")
    job_id = client.submit_and_run("SELECT 1", "result_table")

    assert job_id == "1234-5678"
    assert mock_request.call_count == 2  # noqa: PLR2004 - submit + run
