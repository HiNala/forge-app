# Forge API overview

Base URL: **`/api/v1`** (versioned). Public pretty URLs: **`/p/{org_slug}/{page_slug}`** (see `public_api`, `public_runtime`).

For machine-readable discovery, use **`GET /api/v1/openapi.json`** (FastAPI). This page is a **human map** for onboarding.

## Auth & identity

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/v1/auth/signup` | Clerk JWT; creates user/org bootstrap |
| GET | `/api/v1/auth/me` | User + memberships + active org hints |
| PATCH | `/api/v1/auth/me` | Profile fields (`display_name`, `avatar_url`) |
| PATCH | `/api/v1/auth/me/preferences` | JSONB UI preferences |
| POST | `/api/v1/auth/preferences` | Same as preferences upsert (BI-03 alias) |
| POST | `/api/v1/auth/switch-org` | Validates membership; returns active org id |
| POST | `/api/v1/auth/signout` | Client-side sign-out hook |
| POST | `/api/v1/auth/webhook` | Clerk events (svix) |

## Organization & brand

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/v1/org/workspaces` | Additional workspace |
| GET | `/api/v1/org` | Current org (tenant header) |
| PATCH | `/api/v1/org` | Update org |
| DELETE | `/api/v1/org` | Soft delete workspace |
| GET | `/api/v1/org/brand` | Brand kit |
| PUT | `/api/v1/org/brand` | Replace brand kit |
| POST | `/api/v1/org/brand/logo` | Logo upload |
| GET | `/api/v1/org/notifications/unread-count` | Stub / count |

## Team, members, invitations

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/team/members` | Roster |
| GET | `/api/v1/team/invitations/pending` | Pending invites |
| DELETE | `/api/v1/team/invitations/{id}` | Cancel |
| POST | `/api/v1/team/invite` | Create invitation |
| POST | `/api/v1/team/transfer-ownership` | Owner transfer |
| POST | `/api/v1/team/invitations/{token}/accept` | Accept (user-only session) |
| PATCH | `/api/v1/team/members/{member_id}` | Role change |
| DELETE | `/api/v1/team/members/{member_id}` | Remove member |

## Pages, publish, submissions (nested)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/pages` | List pages |
| POST | `/api/v1/pages` | Create page |
| GET | `/api/v1/pages/{page_id}` | Detail |
| PATCH | `/api/v1/pages/{page_id}` | Update |
| DELETE | `/api/v1/pages/{page_id}` | Delete |
| POST | `/api/v1/pages/{page_id}/publish` | Publish |
| POST | `/api/v1/pages/{page_id}/unpublish` | Unpublish |
| GET | `/api/v1/pages/{page_id}/versions` | Versions / revisions |
| POST | `/api/v1/pages/{page_id}/revert/{version_id}` | Revert stub |
| POST | `/api/v1/pages/{page_id}/duplicate` | Duplicate stub |
| GET | `/api/v1/pages/{page_id}/submissions` | List submissions |
| GET | `/api/v1/pages/{page_id}/submissions/export` | CSV export |
| * | `/api/v1/submissions/...` | Mounted under `submissions` router for detail/reply/files |

## Studio (SSE + chat)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/studio/usage` | Quota snapshot |
| POST | `/api/v1/studio/generate` | SSE generation |
| POST | `/api/v1/studio/refine` | SSE refine |
| POST | `/api/v1/studio/sections/edit` | Section edit |
| GET/POST | `/api/v1/studio/conversations/...` | Conversation + messages |

## Automations

| Method | Path | Notes |
|--------|------|--------|
| GET/PUT | `/api/v1/pages/{page_id}/automations` | Rule config |
| GET | `/api/v1/pages/{page_id}/automations/runs` | Run history |
| POST | `/api/v1/pages/{page_id}/automations/runs/{run_id}/retry` | Retry |

## Calendar integrations

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/v1/calendar/connect/google` | OAuth start |
| GET | `/api/v1/calendar/callback/google` | OAuth callback |
| GET | `/api/v1/calendar/connections` | List connections |
| DELETE | `/api/v1/calendar/connections/{id}` | Disconnect |

## Analytics

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/pages/{page_id}/analytics/summary` | Summary |
| GET | `/api/v1/pages/{page_id}/analytics/funnel` | Funnel |
| GET | `/api/v1/pages/{page_id}/analytics/engagement` | Engagement |
| GET | `/api/v1/pages/{page_id}/analytics/events` | Raw events |
| GET | `/api/v1/analytics/summary` | Org-wide |

## Billing (Stripe)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/billing/plan` | Plan + subscription fields |
| GET | `/api/v1/billing/usage` | Usage meters |
| POST | `/api/v1/billing/checkout` | Checkout session URL |
| POST | `/api/v1/billing/portal` | Portal URL |
| POST | `/api/v1/billing/webhook` | Stripe webhook |
| GET | `/api/v1/billing/invoices` | Invoice list |

## Templates

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/templates` | Published templates |
| GET | `/api/v1/templates/{id}` | Detail |
| POST | `/api/v1/templates/{id}/use` | Clone into org |
| * | `/api/v1/admin/templates/...` | Admin CRUD (`admin.py`) |
| GET | `/api/v1/public-templates/slugs` | Public slugs |
| GET | `/api/v1/public-templates/by-slug/{slug}` | Public template |

## Public & demos

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/v1/public/demo` | Anonymous SSE demo |
| GET | `/api/v1/public/pages/{org}/{page}` | Published page payload |
| POST | `/p/{org}/{page}/submit` | Public submit (`public_api`) |
| POST | `/p/{org}/{page}/track` | Analytics batch (`public_api`) |

## Webhooks & internal

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/v1/webhooks/resend` | Resend events |
| GET | `/internal/caddy/validate` | Caddy on-demand TLS (`caddy_internal`) |

## Ops

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health`, `/health/live`, `/health/ready`, `/health/deep` | Health |
| GET | `/metrics` | Prometheus |

---

**Naming note:** Mission BI-03 described `/orgs/current/*`; the codebase uses **`/org`** (singular) mounted without redundant `current` — same intent, shorter paths.
