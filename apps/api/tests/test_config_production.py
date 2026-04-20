"""Production Settings guards (launch hardening)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.config import Settings


def _prod_kwargs(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "ENVIRONMENT": "production",
        "SECRET_KEY": "a" * 32,
        "TRUSTED_HOSTS": "api.example.com",
        "CLERK_JWKS_URL": "https://clerk.example/.well-known/jwks.json",
        "CLERK_JWT_ISSUER": "https://clerk.example",
        "APP_PUBLIC_URL": "https://app.example.com",
        "API_BASE_URL": "https://api.example.com",
        "BACKEND_CORS_ORIGINS": ["https://app.example.com"],
        "AUTH_TEST_BYPASS": False,
        "FORGE_E2E_TOKEN": "",
        "METRICS_TOKEN": "test-metrics-token-for-config-tests-only-32chars",
    }
    base.update(overrides)
    return base


def test_production_accepts_strong_secret() -> None:
    Settings(**_prod_kwargs())


@pytest.mark.parametrize(
    "secret",
    [
        "change-me-use-openssl-rand-hex-32",
        "change-me-in-production-use-openssl-rand-hex-32",
        "secret",
        "changeme",
    ],
)
def test_production_rejects_weak_secret(secret: str) -> None:
    with pytest.raises(ValidationError, match="SECRET_KEY"):
        Settings(**_prod_kwargs(SECRET_KEY=secret))


def test_production_rejects_short_secret() -> None:
    with pytest.raises(ValidationError, match="at least"):
        Settings(**_prod_kwargs(SECRET_KEY="x" * 31))


def test_production_rejects_wildcard_trusted_hosts() -> None:
    with pytest.raises(ValidationError, match="TRUSTED_HOSTS"):
        Settings(**_prod_kwargs(TRUSTED_HOSTS="*"))


def test_production_rejects_test_bypass() -> None:
    with pytest.raises(ValidationError, match="AUTH_TEST_BYPASS"):
        Settings(**_prod_kwargs(AUTH_TEST_BYPASS=True))


def test_production_rejects_nonempty_e2e_token() -> None:
    with pytest.raises(ValidationError, match="FORGE_E2E_TOKEN"):
        Settings(**_prod_kwargs(FORGE_E2E_TOKEN="not-empty"))


def test_production_requires_clerk_jwks() -> None:
    with pytest.raises(ValidationError, match="CLERK_JWKS_URL"):
        Settings(**_prod_kwargs(CLERK_JWKS_URL=""))


def test_production_requires_https_public_and_api_urls() -> None:
    with pytest.raises(ValidationError, match="APP_PUBLIC_URL"):
        Settings(**_prod_kwargs(APP_PUBLIC_URL="http://app.example.com"))


def test_production_requires_clerk_issuer() -> None:
    with pytest.raises(ValidationError, match="CLERK_JWT_ISSUER"):
        Settings(**_prod_kwargs(CLERK_JWT_ISSUER=""))


def test_production_rejects_http_cors_origin() -> None:
    with pytest.raises(ValidationError, match="CORS origin"):
        Settings(**_prod_kwargs(BACKEND_CORS_ORIGINS=["http://localhost:3000"]))


def test_production_requires_metrics_token() -> None:
    with pytest.raises(ValidationError, match="METRICS_TOKEN"):
        Settings(**_prod_kwargs(METRICS_TOKEN=""))
