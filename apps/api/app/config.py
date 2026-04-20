"""Application settings — environment-backed (see root ``.env.example``, PRD §9)."""

from __future__ import annotations

import json
from typing import Any, Self

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Reject documented placeholders and other trivial secrets when ENVIRONMENT=production.
_WEAK_SECRET_KEYS = frozenset(
    {
        "",
        "secret",
        "changeme",
        "password",
        "change-me-use-openssl-rand-hex-32",
        "change-me-in-production-use-openssl-rand-hex-32",
    }
)

_PRODUCTION_SECRET_KEY_MIN_LEN = 32


def _parse_cors_origins(v: Any) -> list[str]:
    """Split env string: single URL, CSV, or JSON array string (stored as ``str`` on Settings)."""
    if v is None:
        return ["http://localhost:3000", "http://localhost:3001"]
    if isinstance(v, list):
        return [str(x).strip().rstrip("/") for x in v if str(x).strip()]
    s = str(v).strip()
    if not s:
        return ["http://localhost:3000", "http://localhost:3001"]
    if s.startswith("["):
        try:
            data = json.loads(s)
        except json.JSONDecodeError:
            return ["http://localhost:3000", "http://localhost:3001"]
        if isinstance(data, list):
            return [str(x).strip().rstrip("/") for x in data if str(x).strip()]
        return [s.rstrip("/")]
    if "," in s:
        return [p.strip().rstrip("/") for p in s.split(",") if p.strip()]
    return [s.rstrip("/")]


class Settings(BaseSettings):
    PROJECT_NAME: str = "Forge API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Stored as str so dotenv can use a plain URL (``list`` fields are JSON-decoded before validators).
    BACKEND_CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:3001",
    )
    CORS_ORIGINS_EXTRA: str = ""
    TRUSTED_HOSTS: str = "*"
    APP_ROOT_DOMAIN: str = ""
    ALLOW_ORG_QUERY_PARAM: bool = False
    TRUST_PROXY_HEADERS: bool = False
    FORGE_ADMIN_DATABASE_URL: str | None = None
    FORCE_RATE_LIMIT_IN_TESTS: bool = False
    RATE_LIMIT_IN_TESTS: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/forge_dev"
    REDIS_URL: str = "redis://localhost:6379/0"
    FORGE_CACHE_NS: str = "forge"
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    SENTRY_DSN: str | None = None

    CLERK_JWKS_URL: str = ""
    CLERK_JWT_ISSUER: str = ""
    CLERK_AUDIENCE: str | None = None
    CLERK_WEBHOOK_SECRET: str = ""
    AUTH_TEST_BYPASS: bool = False
    FORGE_E2E_TOKEN: str = ""

    S3_ENDPOINT: str = "http://localhost:9000"
    S3_BUCKET: str = "forge-uploads"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_REGION: str = "us-east-1"
    PUBLIC_ASSET_BASE_URL: str = "http://localhost:9000/forge-uploads"

    RESEND_API_KEY: str = ""
    RESEND_WEBHOOK_SECRET: str = ""
    EMAIL_FROM: str = "noreply@forge.app"
    EMAIL_REPLY_TO: str = ""
    APP_PUBLIC_URL: str = "http://localhost:3000"
    API_BASE_URL: str = "http://localhost:8000"

    GOOGLE_OAUTH_CLIENT_ID: str = ""
    GOOGLE_OAUTH_CLIENT_SECRET: str = ""

    TEAM_INVITE_RATE_LIMIT_PER_MINUTE: int = 10

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_PRO: str = ""
    STRIPE_PRICE_STARTER: str = ""
    PAGE_GENERATION_LIMIT_STARTER: int = 20
    PAGE_GENERATION_LIMIT_PRO: int = 200
    SUBMISSIONS_LIMIT_STARTER: int = 500
    SUBMISSIONS_LIMIT_PRO: int = 10_000
    POSTHOG_API_KEY: str = ""
    POSTHOG_HOST: str = "https://us.i.posthog.com"

    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    LLM_DEFAULT_PROVIDER: str = "openai"
    LLM_MODEL_INTENT: str = "gpt-4o-mini"
    LLM_MODEL_COMPOSE: str = "gpt-4o"
    LLM_MODEL_SECTION_EDIT: str = "gpt-4o-mini"
    LLM_TIMEOUT_SECONDS: float = 120.0
    LLM_FALLBACK_MODELS: str = ""
    LLM_LOG_METRICS: bool = True
    USE_AGENT_COMPOSER: bool = False

    PAGE_GENERATION_QUOTA_TRIAL: int = 100
    PAGE_GENERATION_QUOTA_PRO: int = 100_000
    STUDIO_GENERATE_PER_MINUTE_TRIAL: int = 5
    STUDIO_GENERATE_PER_MINUTE_PRO: int = 30
    UPGRADE_URL: str = "http://localhost:3000/settings/billing"

    FORGE_OPERATOR_ORG_IDS: str = ""
    CADDY_INTERNAL_TOKEN: str = ""
    # Required when ``ENVIRONMENT=production``: ``GET /metrics`` requires header ``X-Metrics-Token``.
    METRICS_TOKEN: str = ""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
        case_sensitive=True,
        extra="ignore",
        env_ignore_empty=True,
    )

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def _coerce_cors_origins_env(cls, v: Any) -> str:
        if v is None:
            return "http://localhost:3000,http://localhost:3001"
        if isinstance(v, list):
            parts = [str(x).strip().rstrip("/") for x in v if str(x).strip()]
            return ",".join(parts) if parts else "http://localhost:3000,http://localhost:3001"
        s = str(v).strip()
        if not s:
            return "http://localhost:3000,http://localhost:3001"
        return s

    def effective_cors_origins(self) -> list[str]:
        merged: list[str] = []
        seen: set[str] = set()
        for raw in _parse_cors_origins(self.BACKEND_CORS_ORIGINS):
            o = str(raw).strip().rstrip("/")
            if o and o not in seen:
                seen.add(o)
                merged.append(o)
        if self.CORS_ORIGINS_EXTRA.strip():
            for part in self.CORS_ORIGINS_EXTRA.split(","):
                o = part.strip().rstrip("/")
                if o and o not in seen:
                    seen.add(o)
                    merged.append(o)
        return merged or ["http://localhost:3000"]

    def llm_fallback_model_list(self) -> list[str]:
        if not self.LLM_FALLBACK_MODELS.strip():
            return []
        return [m.strip() for m in self.LLM_FALLBACK_MODELS.split(",") if m.strip()]

    @model_validator(mode="after")
    def _require_secret_in_production(self) -> Self:
        if self.ENVIRONMENT == "production":
            sk = (self.SECRET_KEY or "").strip()
            if not sk:
                raise ValueError("SECRET_KEY must be set when ENVIRONMENT=production")
            weak_lower = {k.lower() for k in _WEAK_SECRET_KEYS if k}
            if sk.lower() in weak_lower:
                raise ValueError(
                    "SECRET_KEY must not use a documented or trivial placeholder in production"
                )
            if len(sk) < _PRODUCTION_SECRET_KEY_MIN_LEN:
                raise ValueError(
                    f"SECRET_KEY must be at least {_PRODUCTION_SECRET_KEY_MIN_LEN} characters in production"
                )
            if self.AUTH_TEST_BYPASS:
                raise ValueError("AUTH_TEST_BYPASS must be false when ENVIRONMENT=production")
            if (self.TRUSTED_HOSTS or "").strip() == "*":
                raise ValueError(
                    "TRUSTED_HOSTS must list real hostnames in production, not '*' (see TrustedHostMiddleware)"
                )
            if not (self.CLERK_JWKS_URL or "").strip():
                raise ValueError("CLERK_JWKS_URL must be set when ENVIRONMENT=production")
            if (self.FORGE_E2E_TOKEN or "").strip():
                raise ValueError("FORGE_E2E_TOKEN must be empty in production (disable __e2e__ bootstrap)")
            pub = (self.APP_PUBLIC_URL or "").strip()
            api = (self.API_BASE_URL or "").strip()
            if not pub.lower().startswith("https://"):
                raise ValueError("APP_PUBLIC_URL must use https:// in production")
            if not api.lower().startswith("https://"):
                raise ValueError("API_BASE_URL must use https:// in production")
            if not (self.CLERK_JWT_ISSUER or "").strip():
                raise ValueError("CLERK_JWT_ISSUER must be set when ENVIRONMENT=production")
            for origin in self.effective_cors_origins():
                o = (origin or "").strip()
                if o == "*":
                    raise ValueError("CORS origins must not be wildcard in production")
                if not o.lower().startswith("https://"):
                    raise ValueError(
                        f"CORS origin must use https:// in production (got {o!r}). "
                        "Use a dedicated staging environment if you need non-TLS origins."
                    )
            if not (self.METRICS_TOKEN or "").strip():
                raise ValueError(
                    "METRICS_TOKEN must be set when ENVIRONMENT=production "
                    "(GET /metrics requires header X-Metrics-Token; use a long random value)"
                )
        return self


settings = Settings()
