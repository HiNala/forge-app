from __future__ import annotations

import pytest

from app.config import Settings


def production_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "ENVIRONMENT": "production",
        "SECRET_KEY": "x" * 48,
        "TRUSTED_HOSTS": "api.forge.test,forge.test",
        "BACKEND_CORS_ORIGINS": "https://forge.test,https://api.forge.test",
        "DATABASE_URL": "postgresql+asyncpg://forge:secret@db.forge.test:5432/forge",
        "REDIS_URL": "rediss://redis.forge.test:6379/0",
        "AUTH_JWT_SECRET": "a" * 48,
        "GOOGLE_AUTH_CLIENT_ID": "google-auth-client-id",
        "GOOGLE_AUTH_CLIENT_SECRET": "google-auth-client-secret",
        "GOOGLE_OAUTH_CLIENT_ID": "google-client-id",
        "GOOGLE_OAUTH_CLIENT_SECRET": "google-client-secret",
        "METRICS_TOKEN": "m" * 48,
        "RESEND_API_KEY": "re_live_key",
        "SENTRY_DSN": "https://public@example.ingest.sentry.io/1",
        "STRIPE_PRICE_PRO": "price_pro",
        "STRIPE_PRICE_MAX_5X_MONTHLY": "price_m5",
        "STRIPE_PRICE_MAX_20X_MONTHLY": "price_m20",
        "STRIPE_PRICE_EXTRA_USAGE_METERED": "price_meter",
        "STRIPE_SECRET_KEY": "sk_live_test",
        "STRIPE_WEBHOOK_SECRET": "whsec_stripe",
        "S3_ACCESS_KEY": "prod-access",
        "S3_SECRET_KEY": "prod-secret",
        "PUBLIC_ASSET_BASE_URL": "https://assets.forge.test",
        "APP_PUBLIC_URL": "https://forge.test",
        "API_BASE_URL": "https://api.forge.test",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def test_production_settings_accept_complete_launch_manifest() -> None:
    settings = production_settings()
    assert settings.ENVIRONMENT == "production"


def test_production_rejects_missing_metrics_token() -> None:
    with pytest.raises(ValueError, match="METRICS_TOKEN"):
        production_settings(METRICS_TOKEN="")


def test_production_rejects_weak_secret_placeholder() -> None:
    with pytest.raises(ValueError, match="SECRET_KEY"):
        production_settings(SECRET_KEY="change-me-use-openssl-rand-hex-32")


def test_production_rejects_minio_default_storage_credentials() -> None:
    with pytest.raises(ValueError, match="MinIO"):
        production_settings(S3_ACCESS_KEY="minioadmin")


def test_production_rejects_wildcard_cors() -> None:
    with pytest.raises(ValueError, match="CORS"):
        production_settings(BACKEND_CORS_ORIGINS="*")


def test_production_rejects_non_https_public_urls() -> None:
    with pytest.raises(ValueError, match="APP_PUBLIC_URL"):
        production_settings(APP_PUBLIC_URL="http://forge.test")


def test_production_rejects_test_stripe_secret_key() -> None:
    with pytest.raises(ValueError, match="STRIPE_SECRET_KEY"):
        production_settings(STRIPE_SECRET_KEY="sk_test_123")


def test_production_rejects_localhost_datastores() -> None:
    with pytest.raises(ValueError, match="localhost"):
        production_settings(DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/forge")

