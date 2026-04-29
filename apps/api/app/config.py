import json
from typing import Any, Self

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "GlideDesign API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    # Env: comma-separated, JSON array, or list — normalized to string in ``_normalize_backend_cors_origins``.
    backend_cors_origins_raw: str = Field(
        default="http://localhost:3000,http://localhost:3001",
        validation_alias=AliasChoices("BACKEND_CORS_ORIGINS", "CORS_ORIGINS"),
    )
    # Comma-separated extra origins (staging/prod frontends). Merged with backend defaults (BI-02).
    CORS_ORIGINS_EXTRA: str = ""
    # Comma-separated hosts for TrustedHostMiddleware; "*" allows any (development only).
    TRUSTED_HOSTS: str = "*"
    # Subdomain tenant routing: ``{slug}.{APP_ROOT_DOMAIN}`` → resolve org by slug.
    APP_ROOT_DOMAIN: str = ""
    # Non-production: allow ``?org=<uuid>`` for manual testing (BI-02).
    ALLOW_ORG_QUERY_PARAM: bool = False
    # When true, use X-Forwarded-For for rate limits and public IP logging (set behind a trusted proxy).
    TRUST_PROXY_HEADERS: bool = False
    # Optional second DB URL using a BYPASSRLS role — reserved for future admin tooling (BI-02).
    FORGE_ADMIN_DATABASE_URL: str | None = Field(
        default=None,
        validation_alias=AliasChoices("FORGE_ADMIN_DATABASE_URL", "GLIDEDESIGN_ADMIN_DATABASE_URL"),
    )
    # pytest: allow ``monkeypatch.setattr(settings, "FORCE_RATE_LIMIT_IN_TESTS", True)`` to exercise 429 paths.
    FORCE_RATE_LIMIT_IN_TESTS: bool = False
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/forge_dev"
    REDIS_URL: str = "redis://localhost:6379/0"
    # Prefix for cache keys so dev/staging can share one Redis (BI-04).
    FORGE_CACHE_NS: str = Field(
        default="glidedesign",
        validation_alias=AliasChoices("FORGE_CACHE_NS", "GLIDEDESIGN_CACHE_NS"),
    )
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    SENTRY_DSN: str | None = None
    # Run rate limiting during pytest (off by default so integration tests are deterministic).
    RATE_LIMIT_IN_TESTS: bool = False

    # First-party auth
    AUTH_JWT_SECRET: str = ""
    AUTH_JWT_ISSUER: str = "glidedesign-api"
    AUTH_JWT_AUDIENCE: str = "glidedesign-web"
    AUTH_ACCESS_TOKEN_TTL_SECONDS: int = 900
    AUTH_REFRESH_TOKEN_TTL_SECONDS: int = 60 * 60 * 24 * 30
    AUTH_PASSWORD_MIN_LENGTH: int = 12
    # Dev/test: allow compatibility test-user / tenant headers without JWT (never enable in prod)
    AUTH_TEST_BYPASS: bool = False
    # CI/E2E only: ``POST /api/v1/__e2e__/seed-org`` requires the compatibility E2E token header.
    # Leave empty to disable the route (production default).
    FORGE_E2E_TOKEN: str = Field(
        default="",
        validation_alias=AliasChoices("FORGE_E2E_TOKEN", "GLIDEDESIGN_E2E_TOKEN"),
    )

    # Storage (MinIO / S3)
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_BUCKET: str = "forge-uploads"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_REGION: str = "us-east-1"
    PUBLIC_ASSET_BASE_URL: str = "http://localhost:9000/forge-uploads"

    # Email
    RESEND_API_KEY: str = ""
    RESEND_WEBHOOK_SECRET: str = ""
    EMAIL_FROM: str = "GlideDesign <noreply@glidedesign.ai>"
    APP_PUBLIC_URL: str = "http://localhost:3000"
    # Public API base (OAuth callbacks, webhooks) — no trailing slash
    API_BASE_URL: str = "http://localhost:8000"

    # Google Calendar OAuth (web application)
    GOOGLE_OAUTH_CLIENT_ID: str = ""
    GOOGLE_OAUTH_CLIENT_SECRET: str = ""
    # Google login OAuth (openid email profile). If omitted, the calendar OAuth client values are reused.
    GOOGLE_AUTH_CLIENT_ID: str = ""
    GOOGLE_AUTH_CLIENT_SECRET: str = ""

    # Rate limits
    TEAM_INVITE_RATE_LIMIT_PER_MINUTE: int = 10

    # Stripe (Mission 06)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    # Stripe Billing — product price IDs (test mode: `price_...`, live: set in Railway)
    STRIPE_PRICE_PRO: str = ""
    STRIPE_PRICE_PRO_ANNUAL: str = ""
    STRIPE_PRICE_MAX_5X_MONTHLY: str = ""
    STRIPE_PRICE_MAX_5X_ANNUAL: str = ""
    STRIPE_PRICE_MAX_20X_MONTHLY: str = ""
    STRIPE_PRICE_MAX_20X_ANNUAL: str = ""
    STRIPE_PRICE_EXTRA_USAGE_METERED: str = ""
    # Stripe Billing meter event name; legacy meter names remain valid until dashboard migration.
    FORGE_CREDIT_METER_EVENT_NAME: str = Field(
        default="forge.credit.consumed",
        validation_alias=AliasChoices("FORGE_CREDIT_METER_EVENT_NAME", "GLIDEDESIGN_CREDIT_METER_EVENT_NAME"),
    )
    # Deprecated — historical Starter SKU; omit in prod (AL-02)
    STRIPE_PRICE_STARTER: str = ""
    # Stripe Tax: enable Dashboard + Stripe Tax before turning this on (BP-04).
    STRIPE_CHECKOUT_AUTOMATIC_TAX: bool = False
    PAGE_GENERATION_LIMIT_STARTER: int = 20
    PAGE_GENERATION_LIMIT_PRO: int = 200
    SUBMISSIONS_LIMIT_STARTER: int = 500
    SUBMISSIONS_LIMIT_PRO: int = 10_000
    POSTHOG_API_KEY: str = ""
    POSTHOG_HOST: str = "https://us.i.posthog.com"

    # LLM (LiteLLM — docs/plan/02_PRD.md, Mission 03)
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
    # Mission O-03 — expert composer agents (ComponentTree + Jinja). Off by default for CI.
    USE_AGENT_COMPOSER: bool = False
    # BP-01 — Ten-agent product-thinking orchestrator (Intent→…→Memory). Legacy pipeline remains as fallback.
    USE_PRODUCT_ORCHESTRATOR: bool = True

    # Mission 03 — Studio quotas & rate limits (per org / per user)
    PAGE_GENERATION_QUOTA_TRIAL: int = 100
    PAGE_GENERATION_QUOTA_PRO: int = 100_000
    STUDIO_GENERATE_PER_MINUTE_TRIAL: int = 5
    STUDIO_GENERATE_PER_MINUTE_PRO: int = 30
    # Clarify follow-up window for ``POST /studio/generate/continue`` with ``run_id`` (AL-03).
    CLARIFY_SESSION_TTL_SECONDS: int = 1800
    UPGRADE_URL: str = "http://localhost:3000/settings/billing"

    # Internal admin API (`/api/v1/admin/*`) — comma-separated org UUIDs (Mission 01)
    FORGE_OPERATOR_ORG_IDS: str = Field(
        default="",
        validation_alias=AliasChoices("FORGE_OPERATOR_ORG_IDS", "GLIDEDESIGN_OPERATOR_ORG_IDS"),
    )

    # Caddy on-demand TLS `ask` — optional shared secret (set in prod if endpoint is exposed)
    CADDY_INTERNAL_TOKEN: str = ""

    # Prometheus `/metrics` endpoint — optional bearer token (set in prod when the endpoint is publicly
    # routable). Leave empty in dev. Compared with ``hmac.compare_digest`` in app.main to avoid timing leaks.
    METRICS_TOKEN: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
        env_ignore_empty=True,
    )

    @field_validator("backend_cors_origins_raw", mode="before")
    @classmethod
    def _normalize_backend_cors_origins(cls, v: Any) -> str:
        if v is None:
            return "http://localhost:3000,http://localhost:3001"
        if isinstance(v, list):
            return ",".join(str(x).strip().rstrip("/") for x in v if str(x).strip())
        s = str(v).strip()
        if not s:
            return "http://localhost:3000,http://localhost:3001"
        if s.startswith("["):
            try:
                data = json.loads(s)
            except json.JSONDecodeError:
                return "http://localhost:3000,http://localhost:3001"
            if isinstance(data, list):
                return ",".join(str(x).strip().rstrip("/") for x in data if str(x).strip())
            return s
        return s

    @property
    def BACKEND_CORS_ORIGINS(self) -> list[str]:
        raw = self.backend_cors_origins_raw.strip()
        if not raw:
            return ["http://localhost:3000", "http://localhost:3001"]
        if "," in raw:
            return [p.strip().rstrip("/") for p in raw.split(",") if p.strip()]
        return [raw.rstrip("/")]

    def effective_cors_origins(self) -> list[str]:
        """Origins for CORSMiddleware: dev defaults plus optional ``CORS_ORIGINS_EXTRA`` (comma-separated)."""
        merged: list[str] = []
        seen: set[str] = set()
        for raw in self.BACKEND_CORS_ORIGINS:
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
        return merged if merged else ["http://localhost:3000", "http://localhost:3001"]

    @model_validator(mode="after")
    def _require_secret_in_production(self) -> Self:
        if self.ENVIRONMENT.lower() == "production":
            def require_https_url(name: str, value: str) -> None:
                if not value.strip().startswith("https://"):
                    raise ValueError(
                        f"{name} must start with https:// when ENVIRONMENT=production "
                        "(see docs/deployment/ENV_MANIFEST.md)"
                    )

            if not (self.SECRET_KEY or "").strip():
                raise ValueError("SECRET_KEY must be set when ENVIRONMENT=production")
            weak_secrets = {
                "change-me-in-production-use-openssl-rand-hex-32",
                "change-me-use-openssl-rand-hex-32",
                "change-me",
                "secret",
                "your-secret-key",
                "dev-secret",
                "placeholder",
                "forge-dev",
            }
            if self.SECRET_KEY.strip() in weak_secrets or len(self.SECRET_KEY.strip()) < 32:
                raise ValueError("SECRET_KEY must be a strong random value in production")
            if self.AUTH_TEST_BYPASS:
                raise ValueError("AUTH_TEST_BYPASS must be false when ENVIRONMENT=production")
            if (self.TRUSTED_HOSTS or "").strip() == "*":
                raise ValueError(
                    "TRUSTED_HOSTS must list real hostnames in production, not '*' (see TrustedHostMiddleware)"
                )
            if len((self.AUTH_JWT_SECRET or "").strip()) < 32:
                raise ValueError("AUTH_JWT_SECRET must be at least 32 characters in production")
            if len((self.METRICS_TOKEN or "").strip()) < 32:
                raise ValueError("METRICS_TOKEN must be at least 32 characters in production")
            if "*" in self.effective_cors_origins():
                raise ValueError("CORS origins must be explicit in production, not '*'")
            require_https_url("APP_PUBLIC_URL", self.APP_PUBLIC_URL)
            require_https_url("API_BASE_URL", self.API_BASE_URL)
            require_https_url("PUBLIC_ASSET_BASE_URL", self.PUBLIC_ASSET_BASE_URL)
            required = {
                "AUTH_JWT_SECRET": self.AUTH_JWT_SECRET,
                "GOOGLE_AUTH_CLIENT_ID": self.google_auth_client_id,
                "GOOGLE_AUTH_CLIENT_SECRET": self.google_auth_client_secret,
                "GOOGLE_OAUTH_CLIENT_ID": self.GOOGLE_OAUTH_CLIENT_ID,
                "GOOGLE_OAUTH_CLIENT_SECRET": self.GOOGLE_OAUTH_CLIENT_SECRET,
                "METRICS_TOKEN": self.METRICS_TOKEN,
                "RESEND_API_KEY": self.RESEND_API_KEY,
                "SENTRY_DSN": self.SENTRY_DSN or "",
                "STRIPE_PRICE_PRO": self.STRIPE_PRICE_PRO,
                "STRIPE_PRICE_MAX_5X_MONTHLY": self.STRIPE_PRICE_MAX_5X_MONTHLY,
                "STRIPE_PRICE_MAX_20X_MONTHLY": self.STRIPE_PRICE_MAX_20X_MONTHLY,
                "STRIPE_PRICE_EXTRA_USAGE_METERED": self.STRIPE_PRICE_EXTRA_USAGE_METERED,
                "STRIPE_SECRET_KEY": self.STRIPE_SECRET_KEY,
                "STRIPE_WEBHOOK_SECRET": self.STRIPE_WEBHOOK_SECRET,
            }
            missing = [key for key, value in required.items() if not str(value or "").strip()]
            if missing:
                raise ValueError(f"Missing production settings: {', '.join(sorted(missing))}")
            if not self.STRIPE_SECRET_KEY.strip().startswith("sk_live_"):
                raise ValueError("STRIPE_SECRET_KEY must be a live key (sk_live_...) in production")
            if "localhost" in self.DATABASE_URL or "localhost" in self.REDIS_URL:
                raise ValueError("DATABASE_URL and REDIS_URL must not point at localhost in production")
            if self.S3_ACCESS_KEY == "minioadmin" or self.S3_SECRET_KEY == "minioadmin":
                raise ValueError("Production object storage credentials must not use MinIO development defaults")
            if (self.FORGE_E2E_TOKEN or "").strip():
                raise ValueError("FORGE_E2E_TOKEN must be empty in production (disable __e2e__ bootstrap)")
        return self

    def llm_fallback_model_list(self) -> list[str]:
        if not self.LLM_FALLBACK_MODELS.strip():
            return []
        return [m.strip() for m in self.LLM_FALLBACK_MODELS.split(",") if m.strip()]

    @property
    def auth_jwt_secret(self) -> str:
        return (self.AUTH_JWT_SECRET or self.SECRET_KEY).strip()

    @property
    def google_auth_client_id(self) -> str:
        return (self.GOOGLE_AUTH_CLIENT_ID or self.GOOGLE_OAUTH_CLIENT_ID).strip()

    @property
    def google_auth_client_secret(self) -> str:
        return (self.GOOGLE_AUTH_CLIENT_SECRET or self.GOOGLE_OAUTH_CLIENT_SECRET).strip()


settings = Settings()
