# BACKEND-INFRA MISSION BI-03 — API Contracts, Services & Background Jobs

**Goal:** Take the database foundation (BI-01) and the request pipeline (BI-02) and wire them into the full REST surface Forge's frontend and public consumers need. Every endpoint has a typed contract, every piece of business logic lives in a service, every long-running or flaky operation runs in a background worker. The contracts exposed by this mission are the API that every subsequent mission — frontend, orchestration, automations — codes against.

**Branch:** `mission-bi-03-api-services-jobs`
**Prerequisites:** BI-01 and BI-02 complete. The database is enforced. The middleware is trusted. Routes can now focus on the shape of the product.
**Estimated scope:** Large. 60+ endpoints across 14 routers. Services for pages, submissions, brand kits, invitations, billing, integrations. A full arq worker configuration.

---

## Experts Consulted On This Mission

- **Jesse James Garrett** — *Does the API's structure tell the story of the product? Are endpoints discoverable from the nouns of the domain?*
- **Jakob Nielsen** — *When the frontend developer hits the API for the first time, do they immediately know where to look?*
- **Guido van Rossum** — *Is the service layer readable? Would a new engineer be productive in it on day one?*

---

## How To Run This Mission

The discipline: **resource-oriented, predictable URL shapes; thin routes, thick services; explicit pagination; everything idempotent that can be.** Where Forge diverges from standard REST is the LLM endpoints (Studio generate/refine/section-edit) — those are SSE streams, not request-response. The orchestration layer lives in its own mission track; here we just scaffold the entry points.

Commit on milestones: each router complete and tested, worker infrastructure running, fixtures loaded, OpenAPI doc reviewed, TS types regenerated.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Auth & Me Endpoints

1. `POST /api/v1/auth/signup` — called AFTER the auth provider creates the identity. Payload: `{org_name?, invitation_token?}`. Service:
    - Idempotent on the auth provider's user_id (don't create duplicate `users` rows).
    - If `invitation_token` present, accept invitation → memberships row.
    - Else create a new org (default name = user's email domain), Owner membership, default brand kit.
    - Start a 14-day Pro trial on the new org.
    Returns `{user, orgs: [{id, slug, role}], active_org_id}`.
2. `GET /api/v1/auth/me` — returns the authenticated user + their memberships with role and org summary info. Cached 60s in Redis with invalidation on org/membership mutation.
3. `PATCH /api/v1/auth/me` — update display_name, avatar_url, timezone, locale. Auto-saves from the Settings page.
4. `POST /api/v1/auth/preferences` — upsert user UI preferences (sidebar collapsed state, theme, etc.) to a small `user_preferences` JSONB blob (add to `users` table via migration — simple JSONB column).
5. `POST /api/v1/auth/switch-org` — validates the user has a membership for the target org, refreshes session. Returns new `active_org_id`.
6. `DELETE /api/v1/auth/me` — soft-delete. Queues a worker job to scrub PII in 30 days (audit regulations).

### Phase 2 — Organizations & Memberships

7. `GET /api/v1/orgs/current` — full detail of the active org, including brand kit, plan, usage this period. Cached 30s.
8. `PATCH /api/v1/orgs/current` — update `name`, `slug` (with uniqueness validation and redirect setup for changed slugs).
9. `GET /api/v1/orgs/current/brand` / `PUT /api/v1/orgs/current/brand` — brand kit read/write.
10. `POST /api/v1/orgs/current/brand/logo` — returns a presigned URL pattern (see Phase 11) OR accepts multipart upload and stores to S3, returns the logo URL.
11. `GET /api/v1/orgs/current/members` — list memberships with user details, last active.
12. `PATCH /api/v1/orgs/current/members/{membership_id}` — change role. Validation: cannot change the last Owner's role.
13. `DELETE /api/v1/orgs/current/members/{membership_id}` — remove a member. Cannot remove the last Owner.
14. `POST /api/v1/orgs/current/members/transfer-ownership` — {target_membership_id, password_confirmation}. Transfers the Owner role atomically.
15. `POST /api/v1/orgs/current/invitations` — payload: `{emails: [...], role}`. Creates N rows in `invitations`, queues email sends. Returns the created invitations.
16. `GET /api/v1/orgs/current/invitations` — list pending.
17. `POST /api/v1/orgs/current/invitations/{id}/resend` — re-queue the email, bump expires_at.
18. `DELETE /api/v1/orgs/current/invitations/{id}` — cancel.
19. `POST /api/v1/invitations/accept` — public (authenticated but no active-org required). Payload: `{token}`. Creates the membership, activates it, returns the org info.

### Phase 3 — Pages

20. `GET /api/v1/pages?status=&type=&search=&cursor=&limit=` — cursor-paginated list. Returns `PaginatedPages` with `items` and `next_cursor`.
21. `POST /api/v1/pages` — create a new page (usually called by Studio after generation, but also directly for blank drafts). Payload: `{page_type, title, intent_json?}`. Returns the page detail.
22. `GET /api/v1/pages/{page_id}` — full page detail including current_revision_html, form_schema, automation_config summary.
23. `PATCH /api/v1/pages/{page_id}` — update title, seo_*, custom_domain, og_image_url. Slug changes trigger a redirect setup.
24. `POST /api/v1/pages/{page_id}/duplicate` — clones the page into a new draft in the same org.
25. `DELETE /api/v1/pages/{page_id}` — soft delete. Unpublishes first if live.
26. `POST /api/v1/pages/{page_id}/archive` / `POST /api/v1/pages/{page_id}/unarchive` — archive toggle.
27. `POST /api/v1/pages/{page_id}/publish` — payload: `{slug?}`. If slug provided, validates uniqueness. Creates a published revision pointer. Triggers screenshot generation job (background).
28. `POST /api/v1/pages/{page_id}/unpublish` — flips to draft.
29. `GET /api/v1/pages/{page_id}/revisions?cursor=&limit=` — list revisions.
30. `GET /api/v1/pages/{page_id}/revisions/{revision_id}` — revision detail.
31. `POST /api/v1/pages/{page_id}/revert` — payload: `{revision_id}`. Creates a new revision that's a copy of the target (not a destructive revert). `edit_type = 'revert'`.

### Phase 4 — Studio SSE Entry Points

32. `POST /api/v1/studio/generate` (SSE). Payload: `{prompt, page_type?, provider?}`. Full implementation is in the orchestration mission track. This mission stubs the route, validates the request, enforces the quota (via `BillingGate`), and emits a single SSE event `{"type":"error","code":"not_implemented"}` so the frontend can test wiring.
33. `POST /api/v1/studio/refine` (SSE). Payload: `{page_id, prompt, provider?}`. Same stub pattern.
34. `POST /api/v1/studio/sections/edit` (sync, not SSE). Payload: `{page_id, section, prompt}`. Stub returns 501.
35. `POST /api/v1/studio/sections/suggest` (sync). Stub returns 501.
36. These stubs let the orchestration team work in parallel while the frontend can already hit live SSE endpoints.

### Phase 5 — Submissions

37. `GET /api/v1/pages/{page_id}/submissions?status=&search=&date_from=&date_to=&cursor=&limit=` — cursor-paginated.
38. `GET /api/v1/pages/{page_id}/submissions/{submission_id}` — full detail with file metadata.
39. `PATCH /api/v1/pages/{page_id}/submissions/{submission_id}` — update `status`, `reply_draft`.
40. `POST /api/v1/pages/{page_id}/submissions/{submission_id}/reply` — payload: `{subject, body}`. Queues an `email_reply` job. Updates status to `replied`.
41. `POST /api/v1/pages/{page_id}/submissions/{submission_id}/reply/draft` — generates an AI-suggested draft using the fast LLM tier (implementation in orchestration mission). Returns `{subject, body}`.
42. `POST /api/v1/pages/{page_id}/submissions/bulk-update` — payload: `{submission_ids: [...], status}`. Batch update for the bulk-action bar.
43. `GET /api/v1/pages/{page_id}/submissions/export?format=csv` — streaming response. Generates CSV server-side, sends as attachment.
44. `GET /api/v1/submissions/{submission_id}/files/{file_key}` — signed redirect to S3 for download. Validates org membership before redirecting.

### Phase 6 — Automations & Integrations

45. `GET /api/v1/pages/{page_id}/automations` — current config.
46. `PUT /api/v1/pages/{page_id}/automations` — replace the full config. Auto-saves from the UI.
47. `GET /api/v1/pages/{page_id}/automations/runs?cursor=&limit=` — `automation_jobs` filtered to this page.
48. `POST /api/v1/pages/{page_id}/automations/runs/{job_id}/retry` — re-enqueue a failed job. Resets `attempts` and `status=pending`.
49. `GET /api/v1/integrations` — list the org's connected providers.
50. `POST /api/v1/integrations/google-calendar/connect` — returns a Google OAuth authorization URL with state + PKCE. Implementation uses `httpx-oauth`.
51. `GET /api/v1/integrations/google-calendar/callback?code=&state=` — completes the OAuth flow, encrypts tokens with Fernet (key from `INTEGRATION_ENCRYPTION_KEY`), saves to `integrations`. Redirects to `/settings/integrations?connected=google_calendar`.
52. `DELETE /api/v1/integrations/{integration_id}` — disconnect. Marks `status='revoked'`, schedules revoke on the provider side (google's token revocation endpoint).

### Phase 7 — Calendars & Availability (ICS import)

53. `POST /api/v1/calendars` — payload: `{name, source_type: 'ics_upload'|'ics_url'|'google_calendar', source_ref, timezone, business_hours, buffer_before_minutes, buffer_after_minutes, min_notice_minutes, max_advance_days, slot_duration_minutes}`. Creates an `availability_calendars` row. If `source_type='ics_upload'`, client first uploads the file via Phase 11's presigned URL and passes the storage key. Returns the calendar + queues an initial sync job.
54. `GET /api/v1/calendars` — list calendars for the org.
55. `GET /api/v1/calendars/{calendar_id}` — detail including last_synced_at.
56. `PATCH /api/v1/calendars/{calendar_id}` — update settings.
57. `POST /api/v1/calendars/{calendar_id}/sync` — trigger a resync. Idempotent; if a sync job is already running, returns the existing one.
58. `GET /api/v1/calendars/{calendar_id}/availability?date_from=&date_to=&duration_minutes=` — computes available slots between the dates, respecting busy blocks, buffers, business hours, min notice, max advance. Returns `{slots: [{start, end}]}`. This is the endpoint the contact-form page's booking widget calls.
59. Calendar parse service `app/services/calendar/parse.py`:
    - Use Python's `icalendar` package (v6.x, zoneinfo-native).
    - Walk the calendar's VEVENTs. For each, expand recurrence rules via `recurring-ical-events` library to get actual occurrences in the next 6 months.
    - Insert each occurrence into `calendar_busy_blocks`. Idempotent on `(calendar_id, source_uid, starts_at)` — wipe and re-insert on each sync to handle updates cleanly.
    - Skip events with status `CANCELLED` or `TRANSPARENT` transparency (free/busy: "free").
    - Skip all-day events by default (opt-in flag for treating them as busy).
60. Availability computation service `app/services/calendar/availability.py`:
    - Input: calendar_id, date range, desired duration.
    - Load busy blocks, business hours, buffers.
    - Generate candidate slots at the configured slot_duration interval within business hours.
    - Subtract any slot that overlaps (including buffers) with a busy block.
    - Enforce min_notice (exclude slots too soon) and max_advance (exclude slots too far).
    - Return the resulting available slots list.
    - Cache the result per `(calendar_id, date_range, duration)` in Redis with 5-minute TTL, invalidated on calendar sync.

### Phase 8 — Analytics

61. `POST /p/{page_slug}/track` — public, rate-limited. Accepts a batch of up to 10 events. Validates page exists and is live. Writes to `analytics_events` in a single INSERT. Stubbed here with basic write; advanced aggregation in the analytics frontend mission.
62. `GET /api/v1/pages/{page_id}/analytics/summary?range=7d|30d|90d` — hero KPIs. Uses cached aggregates.
63. `GET /api/v1/pages/{page_id}/analytics/funnel` — form-specific funnel. 404 if `page_type` is not a form variant.
64. `GET /api/v1/pages/{page_id}/analytics/engagement` — proposal/landing engagement metrics.
65. `GET /api/v1/pages/{page_id}/analytics/events?cursor=&limit=` — raw event stream for debugging.
66. `GET /api/v1/analytics/summary?range=` — org-wide aggregate.
67. Analytics queries are defined in `app/services/analytics/queries.py` — named, tested, with `EXPLAIN ANALYZE` results checked in. Every query runs against the org's partition subset, hitting the indexes created in BI-01.

### Phase 9 — Billing

68. `GET /api/v1/billing/plan` — current plan, status, next_invoice_at, payment_method_last4.
69. `GET /api/v1/billing/usage` — current period usage from `usage_counters` + live count for this month's partial. Shows percent remaining.
70. `POST /api/v1/billing/checkout` — payload: `{plan: 'starter'|'pro'}`. Creates a Stripe Checkout Session (`client_reference_id = org_id`), success URL, cancel URL. Returns `{url}`. Frontend redirects.
71. `POST /api/v1/billing/portal` — creates a customer portal session, returns the URL.
72. `POST /api/v1/webhooks/stripe` — no auth; verifies signature against `STRIPE_WEBHOOK_SECRET`. Handles idempotency via `stripe_events_processed`. Dispatches to handlers per event type:
    - `checkout.session.completed` — attach stripe_customer_id + stripe_subscription_id to org, set plan.
    - `customer.subscription.updated` — update plan.
    - `customer.subscription.deleted` — downgrade to starter.
    - `invoice.payment_failed` — email owner, set banner flag.
    - `invoice.payment_succeeded` — clear failure flag.
    - `customer.subscription.trial_will_end` — email 3 days before.
73. `BillingGate` service (`app/services/billing/gate.py`): `check_quota(org_id, metric)` — raises `QuotaExceeded` if over. Plans table hard-coded in `app/services/billing/plans.py`:
    - Starter: 20 pages/mo, 500 submissions/mo, 1 seat, basic analytics.
    - Pro: 200 pages/mo, 10k submissions/mo, 10 seats, full analytics, custom domain.
    - Enterprise: configured per-contract in `organizations.metadata`.

### Phase 10 — Templates

74. `GET /api/v1/templates?category=&search=` — list published templates. Public (authenticated) endpoint.
75. `GET /api/v1/templates/{id}` — template detail.
76. `POST /api/v1/templates/{id}/use` — clones template into a new Page draft in the current org. Applies the org's brand kit (simple color/font swap on the HTML; deep integration in orchestration). Returns the new page ID.
77. `POST /api/v1/admin/templates` / `PATCH /api/v1/admin/templates/{id}` / `DELETE /api/v1/admin/templates/{id}` — admin only.

### Phase 11 — File Uploads (Presigned URLs)

78. `POST /api/v1/uploads/presign` — payload: `{purpose, content_type, size_bytes}`. Validates size against purpose-specific limit. Generates a presigned PUT URL for S3 (or MinIO in dev) with a unique key and 10-minute expiry. Returns `{upload_url, storage_key, public_url, fields}`.
79. Purposes: `brand_logo` (2MB), `submission_file` (10MB — used from public pages), `ics_calendar` (1MB), `pitch_asset` (20MB — for pitch deck image assets).
80. Each storage key is namespaced `{org_id}/{purpose}/{uuid}.{ext}` to make lifecycle policies easy.
81. `POST /api/v1/uploads/verify` — after a client-side upload, verify the object exists in storage, attach metadata to the appropriate table (brand_kit.logo_url, submission.files[], etc.). Prevents orphan keys.

### Phase 12 — Public Page Serving

82. `GET /p/{org_slug}/{page_slug}` — renders the published page. Backend returns HTML directly (not via the SPA). Reads the published revision's html + brand_snapshot + injected scripts (analytics tracker, submission handler). Caches the rendered HTML in Redis with 5-minute TTL, keyed by `{page_id}:{published_revision_id}`. Invalidates on republish.
83. `POST /p/{slug}/submit` — accepts both JSON (JS-enabled) and multipart (JS-disabled fallback). Validates against `form_schema`. Writes to `submissions`. Triggers automation job chain. Returns a success response (JSON for JS, HTML redirect for multipart).
84. `POST /p/{slug}/upload` — public presigned URL for submission files. Rate-limited per IP.
85. Custom domain support: middleware checks the `Host` header against `organizations.custom_domain` table entries, routes to the right page.

### Phase 13 — Background Worker (arq)

86. Configure `arq` in `apps/api/app/worker.py` with:
    - Redis connection using the same Redis as rate limiting.
    - Worker settings: `max_jobs=20`, `job_timeout=120`, `keep_result=3600`, `poll_delay=0.5`.
    - Cron jobs: `partman_maintenance` daily at 02:00 UTC, `purge_expired_invitations` daily, `refresh_calendar_syncs` every 6 hours.
87. Register job functions for:
    - `email_notify` (Resend notify owner)
    - `email_confirm` (Resend notify submitter)
    - `email_reply` (Resend send reply)
    - `email_invitation` (Resend invitation)
    - `email_billing_failed` (Resend)
    - `calendar_create_event` (Google Calendar API)
    - `ics_calendar_sync` (parse ICS, populate busy blocks)
    - `page_screenshot` (Playwright screenshot for dashboard thumbnails; used on publish)
    - `template_preview_screenshot` (Playwright)
    - `ai_cost_aggregate` (hourly rollup of `page_revisions` costs into `usage_counters`)
    - `purge_deleted_user` (30-day delay PII scrub)
88. All job functions are idempotent. All take an `organization_id` parameter and the job's context sets session variables via `SET LOCAL` before any DB operation — so worker jobs also operate under RLS.
89. Jobs use structured retry with exponential backoff. Max 5 attempts. After 5, status → `dead` and alert fires.
90. Deploy the worker as a separate Docker service in compose (same image as the API, different CMD).

### Phase 14 — Documentation & Tests

91. `tests/test_api_contracts.py` — for every endpoint, a happy-path test. Status codes, shapes, idempotency where claimed.
92. `tests/test_services/` — unit tests for every service function. Focus on edge cases, error paths.
93. `tests/test_worker.py` — each job function's happy path and retry behavior.
94. Regenerate `apps/web/src/lib/api/schema.ts` from the live OpenAPI spec. Commit. CI validates it's in sync.
95. Write `docs/architecture/API_OVERVIEW.md` — list of all endpoints, grouped by resource, with one-line descriptions. Sanity-check: can a new engineer find any endpoint in under 30 seconds?
96. Write `docs/runbooks/WORKER.md` — how to deploy, scale, debug stuck jobs, manually re-enqueue, drain the queue.
97. Mission report.

---

## Acceptance Criteria

- All 60+ endpoints implemented, typed, and tested.
- ICS calendar upload + parse + availability query works end-to-end.
- arq worker processes all registered job types with idempotency and retry.
- Stripe webhook is signature-verified and idempotent; all event types are handled.
- OpenAPI spec is rich; TypeScript types regenerated and in sync.
- Analytics queries run in under 100ms against 100k rows on the test dataset.
- Public page serving + submission + analytics tracking works (JS-enabled and JS-disabled paths).
- Custom domain Host routing verified.
- Every service has unit tests; every endpoint has an integration test.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
