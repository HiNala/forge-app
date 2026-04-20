# Forge API overview (REST + public HTML)

**Base paths**

- **Versioned JSON API:** `/api/v1/...` — requires `Authorization: Bearer` (Clerk JWT or `forge_live_*` API token) unless marked public below.
- **Tenant context:** `x-forge-active-org-id` (or `x-forge-tenant-id` / `x-active-org`) on authenticated, org-scoped routes. See [REQUEST_PIPELINE.md](./REQUEST_PIPELINE.md).
- **Public browser pages (pretty URLs):** `/p/{org_slug}/{page_slug}/...` — submit, track, booking, proposal flows (no org header; org resolved from URL + page lookup).
- **Health / ops:** `/health/*`, `/metrics` — unauthenticated where deployed.

**Discoverability**

1. Open **`/api/v1/openapi.json`** (or `/docs`) while the API is running for the authoritative contract and schemas.
2. Regenerate a path list anytime: `cd apps/api && uv run python scripts/dump_openapi_paths.py` (groups routes by OpenAPI tag).
3. Frontend TypeScript types: generate with `pnpm dlx openapi-typescript <url>/api/v1/openapi.json -o apps/web/src/lib/api/schema.ts` when you wire CI (BI-03 follow-up).

---

## Resource map (where to look in code)

| Product area | Router package / prefix | Notes |
|----------------|-------------------------|--------|
| Auth, me, preferences, switch org, Clerk webhook | `app/api/v1/auth.py` `/auth` | Signup creates user+org via `ensure_user_org_signup`; `DELETE /auth/me` schedules `purge_deleted_user` |
| Organization, brand, settings, custom domains, API tokens | `app/api/v1/organization.py` `/org` | “Current org” = tenant from header |
| Team: members, invites, accept token | `app/api/v1/team.py` `/team` | Accept uses `app.invitation_token` RLS escape hatch |
| Pages, publish, versions, CSV export | `app/api/v1/pages.py` `/pages` | Submissions also under `/pages/{id}/submissions` |
| Proposal / deck sub-resources | `app/api/v1/page_proposal.py`, `page_deck.py` | Mounted under `/pages` |
| Studio (SSE generate/refine, section edit) | `app/api/v1/studio.py` `/studio` | LLM orchestration in `services/orchestration/` |
| Submissions (detail, reply, file URL) | `app/api/v1/submissions.py` `/submissions` | |
| Automations config + retry | `app/api/v1/automations.py` | Per-page automation rules + runs |
| Calendar OAuth + connections | `app/api/v1/calendar.py` | Google connect/callback |
| Availability + ICS | `app/api/v1/availability_calendars.py` | Parse/sync in `services/booking_calendar/` |
| Analytics | `app/api/v1/analytics.py` | Org + per-page summaries |
| Billing / Stripe | `app/api/v1/billing.py` | Checkout, portal, webhook |
| Templates (catalog + use) | `app/api/v1/templates.py` | Admin templates under `/admin` |
| Public runtime (Next can also call) | `app/api/v1/public_runtime.py` `/api/v1/public/pages` | Cached HTML for `/p/...` in Next |
| Public visitor API | `app/api/public_api.py` `/p/...` | Submit, track, upload, availability |
| Webhooks (Resend) | `app/api/v1/webhooks.py` | |
| Internal (Caddy TLS ask) | `app/api/caddy_internal.py` `/internal/caddy` | |

---

## REST shape conventions

- **Thin routes** — Pydantic bodies, `Depends(get_db)` + `require_tenant` / `require_role`, delegate to `app/services/*`.
- **Pagination** — mix of limit/offset and cursor-style query params depending on route; OpenAPI lists exact parameters.
- **Errors** — `application/json` with `code`, `message`, `request_id` (see BI-02 exception handlers in `app/main.py`).
- **Idempotency** — signup and webhooks use natural keys / Stripe event ids; background jobs use deterministic `_job_id` where applicable (`purge_deleted_user`).

---

## Divergence from early BI-03 draft specs

- **URL naming:** Org routes use **`/api/v1/org`** (not `/orgs/current`); team routes use **`/api/v1/team`** (members, invitations). Behavior matches the mission intent (current org from tenant context).
- **Studio:** Full SSE pipelines exist where the mission described stubs; quota + rate limits still apply.
- **Dedicated `/api/v1/uploads/presign`:** Presign flows may live under feature-specific routes (e.g. brand logo, submission files); consolidate under a single uploads router in a follow-up if product wants one affordance.
