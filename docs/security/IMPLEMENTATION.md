# Security implementation (MVP)

This document maps **PRD §11 Security Posture** and common controls to concrete code and configuration. It is not a penetration-test report; it is the engineering audit trail.

## Transport and hosts

- **HTTPS:** Production URLs are enforced in `Settings` (`APP_PUBLIC_URL`, `API_BASE_URL` must be `https://`). Railway / Caddy terminate TLS; see `infra/`.
- **Host header:** `TrustedHostMiddleware` uses `TRUSTED_HOSTS` (must not be `*` in production).
- **Reverse proxy:** Set `TRUST_PROXY_HEADERS=true` behind a trusted load balancer so rate limits and IP logging use the real client (`app/core/ip.py`, `main.py` lifespan warning).

## Authentication and session

- **Clerk:** Browser auth uses Clerk; API validates JWTs via JWKS (`app/security/clerk_jwt.py`, `CLERK_JWKS_URL`, `CLERK_JWT_ISSUER`).
- **API tokens:** Long-lived `forge_live_*` tokens are hashed at rest; lookup uses scoped session GUCs (`app/deps/auth.py`).
- **Test bypass:** `AUTH_TEST_BYPASS` only applies when `ENVIRONMENT=test`; production startup rejects it (`app/config.py`).

## Tenant isolation

- **RLS:** PostgreSQL policies on tenant-scoped tables; CI runs `scripts/check-rls.py` after migrations (`.github/workflows/ci.yml`).
- **Application layer:** `TenantMiddleware` sets `app.current_tenant_id`; endpoints use `require_tenant` / org-scoped queries.

## Input validation and injection

- **HTTP APIs:** Pydantic models on request bodies; path/query validated by FastAPI.
- **SQL:** SQLAlchemy bound parameters; no string-interpolated SQL for user input.
- **XSS (admin):** Submission and user-generated content must be rendered as **text** or escaped HTML in React—never `dangerouslySetInnerHTML` for untrusted payloads.

## Rate limiting

- **Middleware:** `app/middleware/rate_limit.py` — public submit, upload, studio, authenticated API buckets; public analytics track uses per-event budget (`app/services/rate_limit.py`).
- **Team invites:** `rate_limit_team_invite` (`TEAM_INVITE_RATE_LIMIT_PER_MINUTE`).

## File uploads

- Presigned PUT constraints, MIME allowlists, size caps (`app/services/submission_attachments.py`, `storage_s3.py`); server-side verification after upload where implemented.

## Observability secrets

- **`GET /metrics`:** In production requires `METRICS_TOKEN` and header `X-Metrics-Token` (`app/main.py`, `app/config.py`).
- **Caddy internal:** `/internal/caddy/validate` requires `CADDY_INTERNAL_TOKEN` and `X-Forge-Caddy-Token` in production (`app/api/caddy_internal.py`).

## Webhooks

- **Stripe:** Signature verification + idempotent processing table (`stripe_events_processed`).
- **Clerk / Resend:** Use vendor SDK verification patterns in respective routers.

## Dependency and supply chain

- **Dependabot:** `.github/dependabot.yml` (npm `apps/web`, pip `apps/api`).
- **Audits:** Run `pnpm audit` and `uv run pip-audit` / `pip-audit` regularly; CI should fail on critical regressions when those jobs are added.

## GDPR / privacy (baseline)

- Account deletion flow and analytics retention are documented in runbooks; IP anonymization for analytics where implemented (`anonymize_ipv4_to_slash24` on ingest).

## Backlog (explicitly not “done” in code)

- Full **CSP** on every HTML surface (generated pages + app) — tune per route; avoid breaking Clerk/third-party scripts.
- **CSRF** on mutating routes — many APIs use Bearer tokens (CSRF reduced); cookie-based flows need explicit tokens if introduced.
- **Virus scanning** for uploads — stub only per PRD.
