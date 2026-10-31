"""F1: the public API base: no login or cookies, CORS, rate limits and the error shape."""

import pytest

from app import config
from app.main import app
from app.rate_limit import RULES

ORIGIN = config.DEV_ORIGIN


def test_works_without_login_and_sets_no_cookie(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json() == {"ok": True, "db": "ok"}
    assert "set-cookie" not in r.headers


def test_known_origin_gets_cors_and_exposed_download_name(client):
    r = client.get("/api/health", headers={"Origin": ORIGIN})
    assert r.headers["access-control-allow-origin"] == ORIGIN
    assert "Content-Disposition" in r.headers["access-control-expose-headers"]


def test_other_origin_gets_no_cors(client):
    r = client.get("/api/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in r.headers


def test_preflight_from_known_origin(client):
    headers = {
        "Origin": ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    }
    r = client.options("/api/v1/imports", headers=headers)
    assert r.status_code == 200 and r.headers["access-control-allow-origin"] == ORIGIN
    assert r.headers["access-control-max-age"] == "600"


@pytest.mark.parametrize("raw", ["", "*", "https://a.example,*", " , "])
def test_production_refuses_open_or_empty_origins(raw):
    with pytest.raises(RuntimeError):
        config.parse_origins("prod", raw)


def test_production_accepts_a_real_origin():
    assert config.parse_origins("prod", "https://a.example, https://b.example") == [
        "https://a.example",
        "https://b.example",
    ]


def test_rate_limit_returns_the_error_shape(client):
    limit = config.RATE_LIMIT_UPLOAD
    for _ in range(limit):
        assert client.post("/api/v1/imports").status_code != 429
    r = client.post("/api/v1/imports", headers={"Origin": ORIGIN})
    assert r.status_code == 429 and r.json()["error"]["code"] == "RATE_LIMITED"
    assert r.headers["access-control-allow-origin"] == ORIGIN  # the page can read the reason


def test_faked_forwarded_address_does_not_escape_the_limit(client):
    for i in range(config.RATE_LIMIT_UPLOAD):
        client.post("/api/v1/imports", headers={"X-Forwarded-For": f"10.0.0.{i}"})
    assert client.post("/api/v1/imports", headers={"X-Forwarded-For": "10.9.9.9"}).status_code == 429


def test_limits_are_counted_per_kind_of_route(client):
    for _ in range(config.RATE_LIMIT_UPLOAD + 1):
        client.post("/api/v1/imports")
    assert client.post("/api/v1/schedules").status_code != 429


def test_every_costly_route_has_a_limit():
    assert {name for _, _, name, _ in RULES} == {"upload", "jobs", "interpret", "export"}


def test_unknown_route_uses_the_error_shape(client):
    r = client.get("/api/v1/nothing-here")
    body = r.json()["error"]
    assert r.status_code == 404 and body["code"] == "NOT_FOUND"
    assert body["requestId"] == r.headers["x-request-id"]


def test_crash_shows_no_internal_details(client):
    def boom():
        raise RuntimeError("secret database detail")

    app.add_api_route("/api/test-crash", boom)
    r = client.get("/api/test-crash", headers={"Origin": ORIGIN})
    assert r.status_code == 500 and r.json()["error"]["code"] == "INTERNAL_ERROR"
    assert "secret" not in r.text
    assert r.headers["access-control-allow-origin"] == ORIGIN


def test_security_headers_on_every_answer(client):
    r = client.get("/api/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert "frame-ancestors 'none'" in r.headers["content-security-policy"]
