# Security testing (GL-03)

## OWASP ZAP

`.github/workflows/security-zap.yml` runs weekly. Before failing builds on HIGH findings:

1. Set `ZAP_TARGET_URL` to staging (HTTPS).
2. Add authenticated scans via ZAP context + script-based login (Clerk session or test token).

## Hand-written probes

Python probes live under `apps/api/tests/security/` (pytest). Extend with new routes and payloads when surfaces ship.

Focus areas from the mission checklist:

- SQLi / XSS on public submit and query params
- CSRF on state-changing browser flows (Playwright + API)
- IDOR across tenant IDs (reuse patterns from `test_rls_via_http.py`)
- Auth bypass attempts (expired JWT, wrong issuer) — extend `tests/test_auth_*.py`

## Rate-limit trust

Verify `TRUST_PROXY_HEADERS` and `X-Forwarded-For` handling in `app/services/rate_limit.py` when adding bypass tests.

## Cookie / header checks

Automate `Set-Cookie` inspection for `Secure`, `HttpOnly`, `SameSite` when a stable E2E auth path exists without Clerk placeholders.
