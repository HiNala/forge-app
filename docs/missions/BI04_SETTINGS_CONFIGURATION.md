# BACKEND-INFRA MISSION BI-04 — User Settings, Preferences & Full Configuration Surface

**Goal:** Build out every setting, preference, and configuration surface that a Forge user, workspace owner, and admin will touch. After this mission, every screen in the frontend's Settings area has a live, tested, correctly-authorized backend behind it. User-level preferences like timezone, theme, and notification cadence. Org-level configuration like branded email defaults, default page templates, custom domains, data retention, and API tokens. And the admin-level cross-tenant surfaces needed for operations — impersonation for support, usage views, and tenant-wide actions.

**Branch:** `mission-bi-04-settings-config`
**Prerequisites:** BI-01, BI-02, BI-03 complete. Every foundational system is in place; this mission fills in the long tail.
**Estimated scope:** Medium. Many endpoints, most CRUD-shaped, but the auth boundaries and audit discipline are demanding.

---

## Experts Consulted On This Mission

- **Dieter Rams** — *Less, but better. Is every setting doing work, or is it cruft?*
- **Jef Raskin** — *Settings are modes. Every one we add is a mode the user must remember. Justify each.*
- **Tony Fadell** — *What happens when a setting changes? Does the whole system react correctly?*
- **Ken Thompson / Dennis Ritchie** — *Settings should default well. A user who touches nothing should still get a good product.*

---

## How To Run This Mission

The philosophy is **good defaults, minimal required configuration, fast feedback on change.** Every setting endpoint should be:
- Idempotent (PUT/PATCH semantics).
- Auditable (writes to `audit_log`).
- Reactive (changes propagate to all consumers within 60 seconds via cache invalidation).
- Authorized precisely (Owners see everything, Editors see most, Viewers see read-only).

Commit on milestones: user preferences, notification config, org-level settings, API tokens, custom domains, data management, admin surface, tests green.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — User Preferences Schema

1. Add `user_preferences` JSONB column to `users` (migration) with default empty object. Shape validated at application layer by a Pydantic model `UserPreferences`:
    ```python
    class UserPreferences(BaseModel):
        sidebar_collapsed: bool = False
        theme: Literal['light', 'dark', 'system'] = 'light'
        reduced_motion: bool = False
        command_palette_last_used: list[str] = []
        pinned_pages: list[UUID] = []
        dismissed_hints: list[str] = []  # IDs of in-app hints the user closed
        analytics_default_range: Literal['7d','30d','90d'] = '30d'
        notifications: UserNotificationPreferences
        
    class UserNotificationPreferences(BaseModel):
        email_on_submission: bool = True
        email_on_automation_failure: bool = True
        email_weekly_summary: bool = True
        email_trial_reminder: bool = True
        email_product_updates: bool = False  # defaults off; explicit opt-in
        browser_push_enabled: bool = False
        digest_cadence: Literal['realtime','daily_9am','weekly_monday','never'] = 'realtime'
    ```
2. Migration should seed existing users with default prefs. Non-breaking; empty JSONB is merged with the Pydantic defaults on read.
3. Endpoints (already stubbed in BI-03, fully implement here):
    - `GET /api/v1/auth/me/preferences` — returns the full preferences merged with defaults.
    - `PATCH /api/v1/auth/me/preferences` — accepts partial preferences, merges with current. No destructive replace.
4. Every patch writes an `audit_log` entry with `action='preferences_updated'` and `changes={field: [old, new]}` for changed fields.
5. Cache: the user's preferences are cached in Redis 60s with invalidation on every write. Shared across API instances.

### Phase 2 — User Profile & Security

6. `PATCH /api/v1/auth/me` (already stubbed) — extend:
    - Re-validate `display_name` against a blocklist (e.g., reserved terms like "admin", profanity).
    - Changing email triggers a verification flow: set `pending_email` column + send verification email via Resend. Confirm via `GET /api/v1/auth/me/email/confirm?token=...`.
    - Timezone uses IANA names; validate against the zoneinfo registry.
7. `POST /api/v1/auth/me/password/change` — (only if auth provider exposes it; Clerk handles internally — this endpoint is a pass-through). For Auth.js with credentials: accepts `{current, new}`, re-verifies current, updates hash.
8. `GET /api/v1/auth/me/sessions` — list active sessions / devices (Clerk provides; Auth.js via DB sessions table).
9. `DELETE /api/v1/auth/me/sessions/{id}` — revoke a specific session.
10. `POST /api/v1/auth/me/mfa/enable` / `.../disable` — MFA toggle (via auth provider's API).
11. `GET /api/v1/auth/me/activity?limit=50` — recent audit_log entries where the user is `actor_user_id`. Useful for the Security section of Settings.

### Phase 3 — Organization Settings

12. `GET /api/v1/orgs/current/settings` — consolidated org config object:
    ```python
    class OrgSettings(BaseModel):
        defaults: OrgDefaults
        notifications: OrgNotificationSettings
        security: OrgSecuritySettings
        data_retention: DataRetentionSettings
        
    class OrgDefaults(BaseModel):
        default_page_type: PageType = 'contact_form'
        default_page_visibility: Literal['public','unlisted'] = 'public'
        default_notification_emails: list[EmailStr] = []
        default_confirm_submitter: bool = True
        default_timezone: str = 'America/Los_Angeles'
        
    class OrgNotificationSettings(BaseModel):
        submission_digest_enabled: bool = True
        submission_digest_cadence: Literal['daily','weekly','never'] = 'daily'
        submission_digest_recipients: list[EmailStr] = []
        automation_failure_alert_emails: list[EmailStr] = []
        
    class OrgSecuritySettings(BaseModel):
        require_mfa_for_owners: bool = False
        session_max_age_hours: int = 720  # 30 days
        allowed_oauth_domains: list[str] = []  # if set, only these email domains can sign up via SSO
        ip_allowlist: list[IPv4Network | IPv6Network] = []  # empty = no restriction
        
    class DataRetentionSettings(BaseModel):
        submission_retention_days: int = 365
        analytics_retention_days: int = 90  # raised to 180 for Pro, 365 for Enterprise
        audit_log_retention_days: int = 365
        auto_archive_pages_with_no_activity_days: int | None = None
    ```
13. `PATCH /api/v1/orgs/current/settings` — partial update. Owner-only. Writes to `audit_log`.
14. Storage: add an `org_settings` JSONB column to `organizations`. Same merge-with-defaults pattern as user prefs.
15. Effects of changes:
    - `submission_retention_days` change triggers recomputation of `partman` retention for that tenant.
    - `ip_allowlist` change propagates to the auth middleware on next cache refresh (60s).
    - `require_mfa_for_owners` flipping on triggers a sweep: Owners without MFA get an email notice and must enable within 7 days or their login is blocked.
16. Cache org settings in Redis 60s, invalidate on write.

### Phase 4 — Custom Domains

17. New table `custom_domains`:
    ```sql
    CREATE TABLE custom_domains (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      domain TEXT UNIQUE NOT NULL CHECK (domain ~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$'),
      verification_token TEXT NOT NULL,
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      verified_at TIMESTAMPTZ,
      tls_issued BOOLEAN NOT NULL DEFAULT FALSE,
      tls_issued_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','active','error','revoked')),
      error_message TEXT,
      attached_page_id UUID REFERENCES pages(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ```
    RLS enabled.
18. `POST /api/v1/orgs/current/custom-domains` — payload: `{domain, attached_page_id?}`. Validates plan allows custom domains (Pro+). Generates `verification_token`. Returns DNS instructions.
19. `GET /api/v1/orgs/current/custom-domains` — list.
20. `POST /api/v1/orgs/current/custom-domains/{id}/verify` — server-side resolves TXT record `_forge-verify.{domain}`, checks for `verification_token`. If matched → `verified=TRUE`. Starts TLS issuance watch (Caddy's `on_demand_tls` handles on first request; we don't pre-issue).
21. `DELETE /api/v1/orgs/current/custom-domains/{id}` — detach from page, mark revoked.
22. `GET /internal/caddy/validate?domain=...` — internal endpoint (not under `/api/v1/`, hit by Caddy directly for `on_demand_tls` ask). Returns 200 if the domain is verified. Only reachable from the Caddy service via Railway private networking.
23. Plan enforcement: Starter cannot attach custom domains — endpoint returns 402 `QuotaExceeded`.

### Phase 5 — API Tokens (Programmatic Access)

24. New table:
    ```sql
    CREATE TABLE api_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      created_by UUID NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      prefix TEXT NOT NULL,  -- first 8 chars, for UI display
      token_hash TEXT NOT NULL,  -- SHA-256 of the token, never the plaintext
      scopes TEXT[] NOT NULL DEFAULT ARRAY['read:pages','read:submissions']::TEXT[],
      last_used_at TIMESTAMPTZ,
      last_used_ip INET,
      expires_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_api_tokens_org ON api_tokens(organization_id) WHERE revoked_at IS NULL;
    CREATE INDEX idx_api_tokens_prefix ON api_tokens(prefix);
    ```
    RLS enabled.
25. `POST /api/v1/orgs/current/api-tokens` — payload: `{name, scopes, expires_in_days?}`. Generates a token like `forge_live_<base62-32chars>`. Stores only the SHA-256 hash. Returns the plaintext ONCE in the response. Owner-only action.
26. `GET /api/v1/orgs/current/api-tokens` — list (never returns the plaintext, only metadata).
27. `DELETE /api/v1/orgs/current/api-tokens/{id}` — revoke.
28. Scopes taxonomy:
    - `read:pages`, `write:pages`
    - `read:submissions`, `write:submissions`
    - `read:analytics`
    - `read:org` (plan, usage)
    - `admin:all` (Owner-generated only; full access)
29. Extend `AuthMiddleware` to accept `Authorization: Bearer forge_live_...` in addition to user JWTs. When such a token is presented:
    - Look up by prefix, verify hash match, check not revoked, not expired.
    - Set `request.state.auth_kind = 'api_token'`.
    - Set `user_id` to the token's `created_by` (for audit trail).
    - Set `organization_id` to the token's `organization_id`.
    - Set `user_role` to the most permissive role consistent with the scopes (usually Editor unless `admin:all`).
    - Increment `last_used_at` / `last_used_ip` asynchronously (fire-and-forget worker job).
30. Scope enforcement: every endpoint declares required scopes via a dependency; the middleware or a dependency compares against the token's scopes. JWT (human) sessions have implicit `admin:all`.

### Phase 6 — Webhooks (Outbound, Not Stripe's Inbound)

31. New table:
    ```sql
    CREATE TABLE outbound_webhooks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      created_by UUID NOT NULL REFERENCES users(id),
      url TEXT NOT NULL,
      secret TEXT NOT NULL,  -- used to sign outbound payloads
      events TEXT[] NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(organization_id, url)
    );
    ```
    RLS enabled.
32. Event taxonomy: `submission.created`, `submission.replied`, `page.published`, `page.unpublished`, `automation.failed`.
33. `POST /api/v1/orgs/current/webhooks` / `GET` / `PATCH` / `DELETE` — standard CRUD.
34. `POST /api/v1/orgs/current/webhooks/{id}/test` — fires a test event to the URL with a hand-crafted payload, returns the HTTP response.
35. Dispatch: when any watched event fires, an `outbound_webhook_dispatch` job is enqueued per matching webhook. The worker POSTs the payload with headers:
    - `X-Forge-Event: submission.created`
    - `X-Forge-Signature: t=<timestamp>,v1=<HMAC-SHA256>`
    - `User-Agent: Forge-Webhooks/1.0`
    - Timeout 10s. Retries with exponential backoff up to 5 attempts over 1 hour. After final failure, sends an automation_failure_alert email.
36. Endpoint for viewing recent deliveries: `GET /api/v1/orgs/current/webhooks/{id}/deliveries?cursor=&limit=` — reads from `automation_jobs` filtered to `job_type='outbound_webhook_dispatch'`.

### Phase 7 — Data Management (Export & Delete)

37. `POST /api/v1/orgs/current/export` — queues a worker job to generate a full org export: pages (HTML + revisions + intent), submissions (with file URLs), automation configs, analytics summaries (not raw events — too large and not portable). The worker packages into a tarball on S3 and emails the owner a signed-download link. Owner-only.
38. `GET /api/v1/orgs/current/exports` — list past exports with status + download links (still-valid if < 7 days old).
39. `POST /api/v1/orgs/current/delete` — Owner-only. Requires password re-entry. Queues a `delete_organization` worker job that:
    - Schedules a 30-day soft-delete grace period (status → `cancelled`).
    - Cancels the Stripe subscription.
    - Unpublishes all pages.
    - After 30 days: hard-delete all tenant data. `audit_log` is retained for 1 year (regulatory) with `organization_id` anonymized.
    - If the owner restores before 30 days via `POST /api/v1/orgs/current/restore`, everything comes back online.
40. User-level data request: `POST /api/v1/auth/me/data-export` — emails the user a package of their profile, memberships, audit_log entries. GDPR right-to-data-portability.

### Phase 8 — Email Branding & Templates (Per-Org Overrides)

41. New table:
    ```sql
    CREATE TABLE email_templates_overrides (
      organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
      notify_owner_subject TEXT,
      notify_owner_body TEXT,  -- Markdown or handlebars-ish
      confirm_submitter_subject TEXT,
      confirm_submitter_body TEXT,
      reply_signature TEXT,
      from_name TEXT,  -- e.g., "Reds Construction" instead of "Forge"
      reply_to_override EmailStr,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ```
42. `GET /api/v1/orgs/current/email-templates` — returns current overrides + the system defaults they'd replace, so the UI can show "Customized" vs "Using default".
43. `PUT /api/v1/orgs/current/email-templates` — upsert.
44. `POST /api/v1/orgs/current/email-templates/preview` — payload: `{template_key}`. Renders the template with dummy data and the org's brand kit, returns the HTML so the Settings UI can show a live preview.
45. Variable substitution uses a small safe template engine. Allowed variables: `{submitter.name}`, `{submitter.email}`, `{page.title}`, `{page.url}`, `{org.name}`, `{org.logo_url}`, plus form field values as `{form.field_name}`. Unknown variables render as empty string.

### Phase 9 — Notifications Center

46. New table:
    ```sql
    CREATE TABLE notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      recipient_user_id UUID NOT NULL REFERENCES users(id),
      kind TEXT NOT NULL CHECK (kind IN (
        'submission_new','automation_failed','invitation_accepted',
        'trial_ending','quota_warning','quota_exceeded','custom_domain_verified',
        'export_ready','team_member_added','team_member_removed'
      )),
      title TEXT NOT NULL,
      body TEXT,
      action_url TEXT,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_notifications_recipient_created ON notifications(recipient_user_id, created_at DESC);
    CREATE INDEX idx_notifications_unread ON notifications(recipient_user_id, read_at) WHERE read_at IS NULL;
    ```
    RLS enabled (via `recipient_user_id = current_user_id()` policy).
47. `GET /api/v1/notifications?unread_only=&cursor=&limit=` — the bell dropdown in the TopBar reads this.
48. `POST /api/v1/notifications/mark-read` — payload: `{ids: [...]}` or `{all: true}`.
49. `DELETE /api/v1/notifications/{id}` — delete.
50. In-app notifications are created by the same worker jobs that send email notifications — a unified notification service. The user's digest cadence setting determines whether the email actually fires (e.g., `daily_9am` accumulates in-app notifications all day, sends a single digest at 9am local time).

### Phase 10 — Plan Change & Trial UX

51. `POST /api/v1/billing/plan/upgrade` — payload: `{plan}`. If the org has a payment method on file, it issues the change via Stripe (prorated). Otherwise redirects to `POST /api/v1/billing/checkout`.
52. `POST /api/v1/billing/plan/downgrade` — schedules downgrade at period-end. Creates a `scheduled_plan_change` record (a new small table with `(org_id, target_plan, effective_at)`).
53. `POST /api/v1/billing/plan/downgrade/cancel` — cancels a pending downgrade.
54. Trial lifecycle cron: every hour, find orgs where `trial_ends_at` < NOW() + 3 days and a `trial_reminder` notification hasn't fired — send notification + email.
55. Trial end: when `trial_ends_at` passes and no subscription is active, the org's plan flips to `starter` (free tier) with an in-app banner. No data loss.

### Phase 11 — Admin Surface (Internal Ops)

56. Gate all `/api/v1/admin/*` routes via middleware check: `request.state.user.is_admin == True`. `is_admin` is a column on `users` set via direct DB update for Digital Studio Labs employees (no self-service).
57. `GET /api/v1/admin/orgs?search=&plan=&cursor=` — list all orgs with summary metrics.
58. `GET /api/v1/admin/orgs/{org_id}` — full org detail for support.
59. `POST /api/v1/admin/orgs/{org_id}/impersonate` — creates a short-lived (15 min) impersonation token. Sets `user_id = <admin>` and `organization_id = <org_id>` but with a flag `impersonating=True` in the session. Every action under impersonation is audit-logged with a prominent `action_context='impersonation'`. Top bar shows a red "Impersonating" banner.
60. `POST /api/v1/admin/orgs/{org_id}/suspend` / `unsuspend` — flips `status`. Suspended orgs get a friendly banner on every page; published pages keep serving but Studio is read-only. Brutal flip for violators; reversible.
61. `GET /api/v1/admin/metrics` — MRR, active subscribers by plan, LLM tokens consumed today/this month, top 10 orgs by usage.
62. `GET /api/v1/admin/llm-costs?org_id=&date_from=&date_to=` — cost breakdown per org per provider per model, aggregated from `page_revisions`. Used by the business team for unit economics.
63. `POST /api/v1/admin/feature-flags/{flag}` — toggle feature flags per org (e.g., give Pro-only feature to a Starter org as a comp). Backed by a simple `org_feature_flags` table.

### Phase 12 — Audit Log Surface

64. `GET /api/v1/orgs/current/audit?cursor=&limit=&action=` — paginated audit log. Owners only. The Security section of Settings shows this.
65. Audit log entries are written by a dedicated service `app/services/audit.py`:
    ```python
    await audit.log(action="page.published", resource_type="page", resource_id=page.id, changes={...})
    ```
    Called from every mutating service function. Do NOT rely on a generic ORM hook — explicit is better than implicit for audit trails.
66. Standard audit actions: `user.signed_in`, `user.signed_out`, `membership.created`, `membership.role_changed`, `membership.removed`, `invitation.sent`, `page.created`, `page.published`, `page.unpublished`, `page.deleted`, `brand_kit.updated`, `settings.updated`, `api_token.created`, `api_token.revoked`, `webhook.created`, `custom_domain.added`, `custom_domain.verified`, `data.exported`, `org.deleted`, `impersonation.started`, `impersonation.ended`.

### Phase 13 — Caching Strategy (Consolidation)

67. Formalize the caching approach in `docs/architecture/CACHING.md`:
    - `auth:user:{user_id}` — 60s TTL. Invalidate on user update.
    - `auth:memberships:{user_id}` — 60s TTL. Invalidate on membership change via Redis pubsub.
    - `org:{org_id}` — 30s TTL. Invalidate on org settings update.
    - `org:settings:{org_id}` — 60s TTL.
    - `org:brand:{org_id}` — 120s TTL. Pages reading the brand kit for rendering hit this.
    - `prefs:user:{user_id}` — 60s TTL.
    - `page:public:{page_id}:{revision_id}` — 5 minutes. Invalidate on republish.
    - `analytics:summary:{page_id}:{range}` — 5 minutes. Invalidate on new events? No — the TTL is cheaper than invalidation.
    - `availability:{calendar_id}:{date_from}:{date_to}:{duration}` — 5 minutes.
68. All cache keys use a configurable namespace prefix (`FORGE_CACHE_NS`) so multiple envs can share a Redis without colliding.
69. Every cache read is wrapped in try/except — a Redis outage must NOT take down the API. On Redis failure, fall through to the DB and log a warning.

### Phase 14 — Feature Flags (Small, Focused)

70. New table:
    ```sql
    CREATE TABLE org_feature_flags (
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      flag TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      set_by UUID REFERENCES users(id),
      set_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (organization_id, flag)
    );
    ```
71. A lightweight client: `await features.is_enabled(org_id, "pitch_deck_workflow")`. Cached 60s.
72. Global defaults in code: `app/core/features.py` has `DEFAULT_FLAGS: dict[str, bool]`. Org overrides win. Keeps rollouts simple.

### Phase 15 — Tests & Documentation

73. Test coverage for every settings endpoint: happy path, unauthorized, out-of-plan, invalid payload.
74. Test: a non-Owner cannot hit Owner-only endpoints (403).
75. Test: an API token with scope `read:pages` can hit `GET /api/v1/pages` but not `POST /api/v1/pages`.
76. Test: custom domain verification with a real DNS TXT lookup against a test domain (mock DNS in test, real DNS in staging).
77. Test: cache invalidation — update a setting, wait 100ms, verify the next GET returns fresh data.
78. Test: org delete → 30-day grace → hard delete. Time-travel via patching `NOW()` in test.
79. Test: the admin impersonation flow sets audit flags correctly.
80. Write `docs/runbooks/SETTINGS.md` — for each setting, what it does, who can change it, what happens downstream.
81. Write `docs/runbooks/SUPPORT_PLAYBOOK.md` — common support scenarios (user can't sign in, org seems suspended, submissions aren't arriving) and which endpoints + logs help.
82. Mission report.

---

## Acceptance Criteria

- Every setting surface in the Settings frontend (Profile, Brand Kit, Team, Integrations, Billing, Notifications, Security, Data, API, Custom Domains, Webhooks, Email Templates) has a working, tested backend.
- User preferences and org settings are consolidated into merged-with-defaults endpoints.
- Custom domain lifecycle (add → verify → TLS → serve) works end-to-end.
- API tokens with scopes authenticate correctly and are enforced.
- Outbound webhook dispatch with HMAC signatures is operational and has retry.
- Data export and org-delete flows work with the correct grace periods.
- Admin surface is gated, impersonation is audit-logged, metrics dashboard returns real data.
- Audit log covers every significant mutation.
- Caching is consistent and gracefully degrades when Redis is unavailable.
- All tests pass; coverage ≥ 85%.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
