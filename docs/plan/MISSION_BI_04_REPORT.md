# Mission BI-04 — User settings, preferences & configuration surface (report)

**Branch:** `mission-bi-04-settings-config`  
**Date:** 2026-04-19

## Implemented

### Schema & migration (`n2b3i404_bi04`)

- Renamed `users.preferences` → `users.user_preferences` (mission naming).
- `users.pending_email`, `users.is_admin`.
- `organizations.org_settings` JSONB, `organizations.account_status`.
- Tables with RLS: `api_tokens`, `outbound_webhooks`, `notifications`, `email_templates_overrides`, `org_feature_flags`, `scheduled_plan_changes`.
- Extended `custom_domains` with verification/TLS/status columns.

### Typed prefs & org settings

- `app/schemas/user_preferences_full.py` — `UserPreferences`, `UserPreferencesPartial`, nested notification prefs.
- `app/schemas/org_settings_full.py` — `OrgSettings`, sparse `OrgSettingsPartial` (dict fragments per section).
- Merge helpers: `user_prefs_merge`, `org_settings_merge`.

### Auth & cache

- `GET /api/v1/auth/me/preferences` — merged defaults; Redis 60s cache (`settings_cache`).
- `PATCH /api/v1/auth/me/preferences` (and POST alias) — partial merge, **audit** `preferences_updated`, invalidates cache. Requires **active org** (`require_tenant`) for audit tenant id.
- `GET /api/v1/auth/me` returns merged preferences JSON for backward compatibility.

### API tokens

- `deps/auth.py` accepts `Authorization: Bearer forge_live_...`, resolves `ApiToken`, sets `request.state.tenant_id` / role; `optional_tenant` short-circuits for `auth_kind=api_token`.
- **RLS lookup:** migration `n2b3i405_lookup` extends `api_tokens` policy so authentication can `SELECT` by `app.api_token_lookup_prefix` + `app.api_token_lookup_hash` GUCs before `app.current_tenant_id` is set; `auth.py` sets/clears those around the lookup query.
- **Test bypass order:** `forge_live_` Bearer is handled **before** `AUTH_TEST_BYPASS` test headers so API token integration tests work under `conftest.py`.
- Org routes: `GET/POST/DELETE /api/v1/org/api-tokens`.
- **Scope enforcement:** `require_api_scopes` depends on `require_user` and is wired on `pages` routes (`read:pages` / `write:pages` / `read:submissions`); JWT sessions bypass scope checks.

### `/orgs/current` aliases

- `app/api/v1/orgs_current_alias.py` mirrors `/org/*` settings and org handlers at `/api/v1/orgs/current/*` (settings, custom domains, API tokens, outbound webhooks, email templates, audit).

### Org settings surface

- `GET/PATCH /api/v1/org/settings` — merged JSON; owner-only write; audit `settings.updated`.

### Custom domains

- `GET/POST/DELETE /api/v1/org/custom-domains`, `POST .../verify` (TXT via **dnspython**). Starter plan → **402** `QuotaExceeded`.

### Webhooks & email templates

- `GET/POST /api/v1/org/webhooks/outbound` (minimal CRUD).
- `GET/PUT /api/v1/org/email-templates`.

### Notifications center

- `GET/POST/DELETE /api/v1/notifications` (+ `POST .../mark-read`).

### Org audit list

- `GET /api/v1/org/audit` — owner-only, cursor-style pagination.

### Billing stubs

- `POST /api/v1/billing/plan/upgrade`, `/plan/downgrade`, `/plan/downgrade/cancel` → **501** until Stripe scheduling.

### Infra

- `FORGE_CACHE_NS`, `docs/architecture/CACHING.md`, `docs/runbooks/SETTINGS.md`, `docs/runbooks/SUPPORT_PLAYBOOK.md`.
- `app/core/features.py` with `DEFAULT_FLAGS` (client `features.is_enabled` still TODO).
- Dependencies: `dnspython` for TXT verification.

## Not completed (explicit follow-up)

- Scope enforcement on **remaining** routers (analytics, org patch, etc.); outbound webhook HMAC dispatch + worker job; data export/delete flows; admin `is_admin` routes; MFA/sessions/email verify; full `test_api_contracts` matrix; **≥85%** coverage target.
- Redis pubsub invalidation for memberships; `scheduled_plan_change` Stripe wiring; email preview engine for templates.

### Extended follow-up (checklist)

- **Billing** — `POST /billing/plan/upgrade|downgrade|downgrade/cancel` are still stubs (501); `scheduled_plan_changes` exists but is not fully wired to Stripe.
- **Admin surface** — Org search, impersonation, suspend, MRR/metrics, LLM cost endpoints, and `POST /admin/feature-flags/{flag}` need implementation plus a `BYPASSRLS` or service-role DB path for cross-tenant reads.
- **Webhooks** — Full dispatch pipeline (HMAC, retries, `automation_jobs` deliveries list) may need worker integration beyond CRUD.
- **Data** — Org export/restore/delete grace flows and `POST /auth/me/data-export` if not yet complete in `organization` / queue workers.
- **Email** — Preview route `POST .../email-templates/preview` and safe template engine.
- **Cron** — Trial reminders and trial end → starter plan automation.
- **Coverage** — Broad tests (DNS mock, cache invalidation, org delete timeline, impersonation audit); expand pytest toward the ≥85% bar.

## Fixes applied during integration passes

1. **Scope enforcement ordering** — `require_api_scopes` calls `await require_user(request)` directly so FastAPI dependency ordering cannot skip authentication before reading `request.state.auth_kind`.
2. **Route parameter order** — `pages.py` paths place `page_id` / `body` before `Depends(require_api_scopes(…))` to satisfy Python’s parameter rules.
3. **Auth in tests** — API tokens are honored under `AUTH_TEST_BYPASS` by checking bearer tokens first.

## Tests

- `tests/test_auth_bi03.py` updated for `user_preferences` column.
- `tests/test_bi04_api_scopes_and_alias.py` — API token with `read:pages` may list pages but not create; `/orgs/current/settings` matches `/org/settings`.
- `PATCH /auth/me` imports `validate_display_name` / `validate_timezone_iana` from `profile_validate`.
- Migration applied: `alembic upgrade head` succeeds on Postgres (single head: `n2b3i405_lookup`).
- Full API suite: 127 tests passing (latest run).
- `uv run pytest tests/test_bi04_api_scopes_and_alias.py` — passing after auth + scope fixes.
