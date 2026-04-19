# OWASP Top 10 — Applied to Forge

**Version:** 2021 (latest published)
**Last researched:** 2026-04-19

## Mitigations by Category

### A01: Broken Access Control
- **RLS on every tenant table**: Even if app code forgets `.where(org_id=...)`, database prevents cross-tenant access.
- **RBAC enforcement**: `require_role()` FastAPI dependency on every mutating endpoint.
- **Non-superuser DB role**: Application connects as `forge_app` (no BYPASSRLS).
- **404 not 403**: Cross-tenant access returns 404 (don't reveal existence).

### A02: Cryptographic Failures
- **HTTPS everywhere**: Railway handles TLS. Custom domains via Caddy/Let's Encrypt.
- **Encrypted tokens**: Calendar OAuth tokens stored AES-GCM encrypted.
- **HttpOnly cookies**: Auth tokens never in localStorage.
- **SECRET_KEY rotation**: Documented in ops runbook.

### A03: Injection
- **SQLAlchemy parameterized queries**: Never string-format SQL.
- **Pydantic validation**: All inputs validated before reaching the database.
- **HTML escaping**: User-supplied fields are escaped before rendering in generated pages.

### A04: Insecure Design
- **Rate limiting**: Per-IP and per-user limits on all endpoints.
- **Idempotent jobs**: All background job operations check for prior completion.
- **Fail-closed RLS**: Missing tenant context returns 0 rows, not all rows.

### A05: Security Misconfiguration
- **No debug in production**: `docs_url=None` in production FastAPI.
- **CORS restricted**: Explicit origin list, not `*`.
- **No secrets in code**: All secrets via environment variables. GitHub secrets scanning enabled.

### A06: Vulnerable and Outdated Components
- **Pinned versions**: All dependencies pinned in lockfiles (`uv.lock`, `pnpm-lock.yaml`).
- **Dependabot/Renovate**: Automated PR for dependency updates.
- **LiteLLM incident awareness**: Pin to known-good version, verify checksums.

### A07: Identification and Authentication Failures
- **Clerk handles auth**: Industry-standard JWT, bcrypt, MFA support.
- **Webhook signature verification**: All webhooks (Clerk, Stripe, Resend) verified.
- **Session management**: HttpOnly, Secure, SameSite cookies.

### A08: Software and Data Integrity Failures
- **CI pipeline**: All code passes lint, typecheck, and tests before merge.
- **Webhook verification**: Prevents fake webhook payloads.
- **Signed commits**: Optional but recommended.

### A09: Security Logging and Monitoring Failures
- **Structured logging**: Never `print()` — use Python `logging` with JSON formatter.
- **Sentry**: All unhandled exceptions reported.
- **Auth events logged**: Login, logout, failed attempts, role changes.
- **No PII in logs**: Scrub emails, names from log entries.

### A10: Server-Side Request Forgery (SSRF)
- **No user-controlled URLs fetched server-side**: The backend never fetches arbitrary URLs.
- **Presigned URLs for file access**: Files served via S3 presigned URLs, not proxied.

## Links
- [OWASP Top 10 (2021)](https://owasp.org/Top10/)
