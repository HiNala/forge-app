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
- Org routes: `GET/POST/DELETE /api/v1/org/api-tokens`.

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

- Scope enforcement dependency on **all** routers; outbound webhook HMAC dispatch + worker job; data export/delete flows; admin `is_admin` routes; MFA/sessions/email verify; full `test_api_contracts` matrix; **≥85%** coverage target.
- Redis pubsub invalidation for memberships; `scheduled_plan_change` Stripe wiring; email preview engine for templates.

## Tests

- `tests/test_auth_bi03.py` updated for `user_preferences` column.
- Migration applied: `alembic upgrade head` succeeds on Postgres.
- Full suite: one occasionally flaky submission list test on Windows (passes on isolated rerun).
