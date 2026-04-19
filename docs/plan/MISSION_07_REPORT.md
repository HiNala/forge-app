# Mission 07 — Polish & Production Readiness (report)

**Branch:** `mission-07-polish`  
**Date:** 2026-04-19

## Completed in this sweep

- **mypy:** Enabled **`strict = true`** in `apps/api/pyproject.toml` and fixed all reported issues (typed JSON columns, Stripe/Google SDK `Any` boundaries, Studio/public SSE `AsyncIterator[bytes]`, provider stubs, etc.).
- **API health:** Added **`GET /health/deep`** — Postgres `SELECT 1`, Redis `PING`, and config flags for Stripe/Resend/OpenAI keys (no live external calls). Test: `tests/test_health.py::test_health_deep_shape`.
- **Lint:** `uv run ruff check app` clean after import/order fixes.
- **Docs:** `docs/security/IMPLEMENTATION.md`, `docs/runbooks/INCIDENT_RESPONSE.md`, `docs/architecture/SYSTEM_OVERVIEW.md` (mermaid).
- **Ops:** `.github/dependabot.yml` for `apps/web` (npm) and `apps/api` (pip/uv).
- **Env:** `.env.example` expanded with `APP_PUBLIC_URL`, `UPGRADE_URL`, and PRD cross-reference.

## Verified commands

| Check | Command |
|--------|---------|
| API | `cd apps/api && uv run ruff check app && uv run mypy app && uv run pytest tests/` |
| Web | `cd apps/web && pnpm run typecheck && pnpm run lint` |

## Intentionally deferred (requires tooling, design assets, or large effort)

These remain **out of scope for a single PR** but are tracked for follow-up:

| Item | Reason |
|------|--------|
| **≥80% line coverage (services)** | Needs dedicated `pytest-cov` baseline and broad test authoring. |
| **Lighthouse ≥95 / ≥85** | Requires scripted runs (CI or local) against running apps; targets in PRD §10. |
| **axe WCAG AA — zero violations** | Requires `@axe-core/cli` or Playwright + axe on every route; fix pass is multi-sprint. |
| **Designer tokens / Figma parity** | No final token file in repo; `tokens.css` remains extensible but not “designer-final.” |
| **`pip-audit` / `pnpm audit` — zero highs** | Run in CI and bump deps as needed; Dependabot helps ongoing. |
| **Structured logging on every endpoint + Sentry `before_send`** | Partial patterns exist; full middleware pass not completed here. |
| **`GET /metrics` Prometheus** | Optional until Railway Prometheus addon is chosen. |
| **Performance regression CI** | Needs benchmark harness for submission p50 and Studio stages (PRD §10). |

## Mission prerequisite chain

- **Mission 08 (deploy)** should assume Mission 07 quality gates (`ruff`, `mypy`, `pytest`, documented env vars) and security runbooks exist.
