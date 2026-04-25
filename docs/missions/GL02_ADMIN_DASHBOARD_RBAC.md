# GO-LIVE MISSION GL-02 — Admin Dashboard & Platform-Level RBAC

**Goal:** Build the control plane Brian uses to run Forge as a business. A dashboard that shows traffic, signups, revenue, usage, LLM spend, and health at a glance. A role-based access control system that lets Brian invite support engineers, analysts, or contractors without handing them the keys. A per-org deep-dive view for debugging customer issues and impersonating when needed (already prepared in BI-04 — this mission builds the UI and extends the backend). And complete AI token observability so Brian can look at any day and say "we spent $187 on Anthropic claude-opus-4-7 for proposal composition across 42 orgs — the top spender was Johnson Plumbing at $34, that's fine; unit economics look healthy." After this mission, Forge has an admin surface that scales from one founder to a small team.

**Branch:** `mission-gl-02-admin-dashboard-rbac`
**Prerequisites:** GL-01 complete — analytics events exist at full granularity. BI-04 seeded `is_admin` on users and laid the impersonation audit groundwork. All orchestration missions complete so `orchestration_runs` has per-run token/cost/quality data.
**Estimated scope:** Medium-large. Platform RBAC schema, admin dashboard UI, LLM cost rollups, cross-tenant queries, impersonation UX, access logs. Critical for operating the business.

---

## Experts Consulted On This Mission

- **Dieter Rams** — *Less, but better. An admin dashboard that shows everything shows nothing.*
- **Edward Tufte** — *This is where data-ink ratio matters most. Every chart earns its pixels.*
- **Jakob Nielsen** — *Admins scan, drill, confirm, act. Design for those four motions.*
- **Don Norman** — *Destructive admin actions must be undoable or triple-confirmed. Never easy.*
- **Oso / Enterprise RBAC patterns (2026)** — *Tenant-scoped roles separate from platform roles. Least privilege by default.*

---

## How To Run This Mission

Two RBAC layers sit side-by-side:
1. **Tenant (org) RBAC** — already exists: Owner / Editor / Viewer on `memberships`. Scoped to a single organization.
2. **Platform RBAC** — this mission. A separate `platform_roles` model for Digital Studio Labs employees and contractors. Fully decoupled from tenant roles — a user can be a tenant Owner of their org AND a platform Support without the two mixing.

Platform RBAC uses a **role-permission-resource** model (per Enterprise RBAC patterns) rather than hardcoded role checks. Roles are bundles of permissions; permissions are fine-grained; new roles are easy to add without code changes.

The admin surface is a separate route tree at `/admin/*` inside the main app (not a separate subdomain — easier to auth). Access is gated: a user without any platform role sees the normal app; a user with a platform role sees an additional "Admin" entry in the profile menu that routes them to `/admin`.

Commit on milestones: platform RBAC schema, permission middleware, admin routes, metrics backend, dashboard UI, org detail view, LLM observability surface, tests green.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Platform RBAC Schema

1. Deprecate the simple `users.is_admin` boolean (from BI-04) in favor of a proper role model. Keep the column for backward compatibility during migration but treat it as read-only.
2. Create the platform RBAC tables:
    ```sql
    CREATE TABLE platform_permissions (
      key TEXT PRIMARY KEY,                   -- 'orgs:read', 'orgs:suspend', 'impersonate:start', etc.
      category TEXT NOT NULL,                  -- 'orgs','users','billing','analytics','system','impersonation'
      description TEXT NOT NULL,
      sensitive BOOLEAN NOT NULL DEFAULT FALSE -- if true, requires fresh auth within 15 min
    );

    CREATE TABLE platform_roles (
      key TEXT PRIMARY KEY,                    -- 'super_admin','admin','support','analyst','billing'
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      system BOOLEAN NOT NULL DEFAULT FALSE   -- system roles can't be deleted via UI
    );

    CREATE TABLE platform_role_permissions (
      role_key TEXT REFERENCES platform_roles(key) ON DELETE CASCADE,
      permission_key TEXT REFERENCES platform_permissions(key) ON DELETE CASCADE,
      PRIMARY KEY (role_key, permission_key)
    );

    CREATE TABLE platform_user_roles (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role_key TEXT REFERENCES platform_roles(key) ON DELETE CASCADE,
      granted_by UUID REFERENCES users(id),
      granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,                  -- for temporary access (contractor during launch week)
      PRIMARY KEY (user_id, role_key)
    );
    CREATE INDEX idx_platform_user_roles_user ON platform_user_roles(user_id);
    ```
    None of these tables have RLS — they're platform-scoped, not tenant-scoped. Access is controlled by the platform permission middleware.
3. Seed the permission catalog (idempotent migration):
    - **orgs**: `orgs:read_list`, `orgs:read_detail`, `orgs:edit_plan`, `orgs:suspend`, `orgs:unsuspend`, `orgs:delete`, `orgs:restore`.
    - **users**: `users:read_list`, `users:read_detail`, `users:edit_platform_roles`, `users:reset_email`, `users:force_mfa`, `users:terminate`.
    - **billing**: `billing:read_mrr`, `billing:read_invoices`, `billing:issue_refund`, `billing:apply_credit`, `billing:edit_plan_terms`.
    - **analytics**: `analytics:read_org_metrics`, `analytics:read_platform_metrics`, `analytics:export`.
    - **llm**: `llm:read_usage`, `llm:read_cost_attribution`, `llm:read_run_traces`, `llm:edit_routing`.
    - **system**: `system:read_health`, `system:read_logs`, `system:toggle_feature_flags`, `system:manage_templates`, `system:manage_permissions`.
    - **impersonation**: `impersonate:start`, `impersonate:any_org`.
    - **audit**: `audit:read_all`.
4. Seed the default system roles:
    - **Super Admin (`super_admin`)** — every permission, including `users:edit_platform_roles` and `system:manage_permissions`. Intended for Brian + one backup. Granted manually via a Postgres shell command in the runbook.
    - **Admin (`admin`)** — everything except `users:edit_platform_roles`, `users:terminate`, `system:manage_permissions`. For trusted full-time team members.
    - **Support (`support`)** — `orgs:read_*`, `users:read_*`, `impersonate:start`, `audit:read_all`, `llm:read_run_traces` (for debugging user-reported AI issues). NO plan edits, NO billing actions, NO deletes. For support engineers.
    - **Analyst (`analyst`)** — `analytics:read_platform_metrics`, `analytics:export`, `llm:read_usage`, `llm:read_cost_attribution`, `billing:read_mrr`. Read-only business analytics. For business ops folks or contractors.
    - **Billing (`billing`)** — billing permissions plus org plan editing and refund. For finance operations.
5. Granting the first Super Admin role requires a direct DB write (documented in `docs/runbooks/PLATFORM_ADMIN_BOOTSTRAP.md`). Thereafter, Super Admins can grant roles via the UI.

### Phase 2 — Permission Check Middleware

6. Create `app/core/platform_auth.py`:
    ```python
    async def load_platform_permissions(user_id: UUID) -> set[str]:
        """Returns the union of all permissions across the user's platform roles."""
        # Cache per user in Redis for 60 seconds.
    
    def require_platform_permission(permission: str):
        """FastAPI dependency factory. 403 if the user lacks the permission."""
        async def dep(ctx: RequestContext = Depends(get_request_context)):
            perms = await load_platform_permissions(ctx.user_id)
            if permission not in perms:
                raise NotAuthorized(code="insufficient_platform_permission", extra={"required": permission})
    ```
7. Every `/api/v1/admin/*` endpoint declares its required permission(s):
    ```python
    @router.get("/admin/orgs", dependencies=[Depends(require_platform_permission("orgs:read_list"))])
    async def list_orgs(...): ...
    ```
8. Sensitive permissions (`users:terminate`, `orgs:delete`, `billing:issue_refund`, `impersonate:any_org`) additionally require **fresh auth** — the user must have signed in within the last 15 minutes OR re-entered their password via a step-up challenge. Implemented via a `require_fresh_auth()` additional dependency. On stale auth, the endpoint returns 401 with code `reauth_required`; the frontend prompts for password confirmation.
9. Any impersonation, permission grant, sensitive action, or data export writes to `audit_log` with `action_context='platform_admin'` so these stand apart from normal org audit entries.
10. Cross-tenant queries (listing all orgs, platform-wide metrics) go through the `get_admin_db()` session (from BI-02, runs as `forge_admin` with BYPASSRLS). This is the ONLY correct way to query across tenants — never toggle RLS in code paths.

### Phase 3 — Admin Navigation & Shell

11. Build the admin shell at `apps/web/src/app/(admin)/layout.tsx`. Visually distinct from the main app — deeper warm background (`#edebe6`), slightly denser layout, a subtle "Admin" pill in the top bar. Reinforces "this is not the customer view."
12. Sidebar sections (each item hidden if the user lacks the relevant permission — principle: don't show users things they can't use):
    - **Overview** — `analytics:read_platform_metrics`
    - **Organizations** — `orgs:read_list`
    - **Users** — `users:read_list`
    - **Billing & MRR** — `billing:read_mrr`
    - **LLM & AI Spend** — `llm:read_usage`
    - **Analytics** — `analytics:read_platform_metrics`
    - **System Health** — `system:read_health`
    - **Feature Flags** — `system:toggle_feature_flags`
    - **Templates** — `system:manage_templates`
    - **Audit Log** — `audit:read_all`
    - **Platform Roles** (Super Admin only) — `users:edit_platform_roles`
13. Every admin page has a breadcrumb trail and a "Back to main app" link in the top bar. Brian should never feel stuck.

### Phase 4 — Overview Dashboard

14. `(admin)/overview/page.tsx` is the landing. Layout:
    - **Top stats row** — 4 cards: Total users · Active this week · MRR · LLM cost today. Each card shows value, 7-day delta (absolute and %), and a mini sparkline.
    - **Business health strip** — MRR chart (30/90/365-day with range toggle), new signups by day (bar chart), trial-to-paid conversion funnel.
    - **Product health strip** — DAU/WAU/MAU chart, pages created by day, first-to-publish time histogram.
    - **AI health strip** — tokens by provider (stacked bar, daily), cost by workflow (pie), quality score distribution (histogram), fallback frequency (counter).
    - **Incident strip** (auto-surfaces only when active) — current alerts, recent failures, orgs with active issues.
15. All charts use Recharts. Date ranges sync via URL params — an analyst can deep-link a specific view.
16. Every card is clickable to drill into the dedicated sub-page. Keeps the overview scannable; detail lives one click away.

### Phase 5 — Organizations Surface

17. `(admin)/orgs/page.tsx` — cross-tenant org list with powerful filters:
    - Search: name, slug, Stripe customer ID, any email of any member.
    - Filter chips: plan (Starter / Pro / Enterprise), status (active / suspended / cancelled / trial), activity (active last 7 days / dormant).
    - Sort: MRR desc, created_at desc, last_active desc, LLM spend desc.
    - Columns: org name, plan, member count, pages count, MRR, 30-day LLM spend, last active, status badge.
    - Cursor-paginated. 50 per page default.
18. `(admin)/orgs/[org_id]/page.tsx` — org detail:
    - **Header**: name, plan, status, primary contact email, created date, Stripe customer link.
    - **Quick actions** (permission-gated): Impersonate · Suspend · Unsuspend · Edit plan · Apply credit · Delete.
    - **Tabs**:
        - **Summary** — usage meters (pages, submissions, AI tokens), recent activity.
        - **Members** — list of all users in the org with their tenant role, last active, MFA status.
        - **Pages** — all pages owned by the org (live/draft/archived) with quick access to each.
        - **Submissions** — rolled-up submission counts per page.
        - **Billing** — Stripe subscription detail, invoices, payment method.
        - **AI usage** — per-run breakdown, cost, token counts by model, quality scores.
        - **Orchestration runs** — the `orchestration_runs` table filtered to this org; click any run to inspect the full prompt/response trace (gated by `llm:read_run_traces`).
        - **Audit log** — everything that has happened to this org.
19. **Impersonation UX** (backend in BI-04): click the Impersonate button → confirm dialog with a required reason textbox ("Debugging reported issue: form not submitting for Lucy Martinez"). On confirm:
    - Backend issues an impersonation token.
    - Frontend stores a banner "⚠ Impersonating {org.name} — reason: {reason} — Exit" with a red background stripe along the top.
    - Every action taken during impersonation is audit-logged with `context={impersonation: true, reason, original_user_id, target_org_id}`.
    - Exit impersonation returns to admin home with a confirmation toast.
20. **Suspend org flow**: requires reason text, reasons are selectable from a dropdown (TOS violation / payment failure / user request / compliance issue / other) plus free-form detail. Sets `organizations.status='suspended'`, blocks Studio but keeps published pages serving, emails the Owner.

### Phase 6 — Users Surface

21. `(admin)/users/page.tsx` — cross-tenant user list.
    - Search: email, name, user ID.
    - Filter: platform role (any / super admin / admin / support / analyst / billing / no platform role), email verification status, MFA status, active this month.
    - Columns: name, email, platform roles (badges), # orgs, last active, signup date.
22. `(admin)/users/[user_id]/page.tsx` — user detail:
    - Profile info (read-only for non-super-admins).
    - Organizations they belong to (with their tenant role in each).
    - Platform roles (editable by users with `users:edit_platform_roles`).
    - Recent sessions (from the auth provider's session log).
    - Recent activity (pulled from `audit_log` where `actor_user_id = this user`).
    - Sensitive actions (gated): Force logout (`users:force_logout`), Reset password (`users:reset_email`), Terminate account (`users:terminate`).
23. `(admin)/users/[user_id]/roles/edit` — grant/revoke platform roles. Shows available roles as toggles, with their permission list expanded for clarity. Changes are audit-logged. Users cannot grant themselves roles they don't have (prevents self-escalation).

### Phase 7 — LLM Observability (Brian's Core Ask)

24. `(admin)/llm/page.tsx` — the AI spending dashboard. Three logical sections:
    - **Spend overview**
        - Total cost today / this week / this month, with % change vs previous period.
        - Stacked bar chart of daily cost by provider (OpenAI / Anthropic / Gemini) over the selected range.
        - Model breakdown table: model, provider, total tokens (input/output/cached), total cost, # of calls, avg cost/call, avg tokens/call, p95 latency.
    - **Attribution**
        - Cost by role (`composer`, `section_editor`, `intent_parser`, `reviewer`, `voice_inferrer`, `refiner`) — which pipeline stages are expensive?
        - Cost by workflow (`contact_form` / `proposal` / `pitch_deck` / `section_edit` / `refine`) — where's the ROI?
        - Cost by org — top 20 orgs by LLM spend this month with their plan; useful for identifying orgs using more than their plan economics support.
        - Cost per user — top users across all orgs.
        - Per-page cost — most expensive single pages ever generated; useful for prompt-optimization targets.
    - **Quality & reliability**
        - Quality score distribution (histogram) from `orchestration_runs.review_findings` — peak should be 80-95.
        - Fallback frequency: how often did the primary provider fail and we hit a fallback? Broken down by primary provider.
        - Degraded-run rate: % of runs finishing with `status='degraded'` or validation-retry cycles > 1.
        - Latency p50/p95/p99 by role.
25. Data source is `orchestration_runs` (per-run granular data from O-02) plus a new aggregated view for performance:
    ```sql
    CREATE MATERIALIZED VIEW llm_cost_daily AS
    SELECT
      organization_id,
      DATE(created_at) AS day,
      graph_name,
      COALESCE(intent->>'workflow', 'unknown') AS workflow,
      jsonb_object_keys(node_timings) AS role,
      (review_findings->>'provider') AS provider,
      (review_findings->>'model') AS model,
      COUNT(*) AS run_count,
      SUM(total_tokens_input) AS tokens_input,
      SUM(total_tokens_output) AS tokens_output,
      SUM(total_cost_cents) AS cost_cents,
      AVG(total_duration_ms) AS avg_duration_ms,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_duration_ms) AS p95_duration_ms
    FROM orchestration_runs
    GROUP BY organization_id, DATE(created_at), graph_name, workflow, role, provider, model;
    ```
    Refreshed every 15 minutes via cron.
26. Every chart is filterable by date range, provider, model, role, workflow, plan tier. Filters sync to URL.
27. **Alerts surface**: a "Recent cost anomalies" strip at the top auto-detects and surfaces:
    - Orgs whose 7-day LLM cost is > 3x their trailing 30-day average.
    - Days where total platform spend exceeded the previous 30-day p95 by > 20%.
    - Runs that ended `status='failed'` — top 10 most recent with direct link to `/admin/orchestration-runs/{id}`.
28. A dedicated `(admin)/orchestration-runs/[id]/page.tsx` — full trace view for a single run:
    - Prompt and context bundle.
    - Intent JSON.
    - Plan JSON.
    - Per-node timings + token/cost breakdown.
    - Full review findings.
    - The final composed output.
    - Permalink-able so support engineers can share with Brian: "here's the failed run."

### Phase 8 — System Health & Operations

29. `(admin)/system/page.tsx` — ops dashboard:
    - Service status panel: API, Web, Worker, Caddy, Postgres, Redis, MinIO, Resend, Stripe, OpenAI, Anthropic, Gemini, Google — red/yellow/green from `/health/deep`.
    - Queue depth: arq job queue depth, consumer lag, oldest pending job.
    - Rate limit hit rate: how often are users hitting limits today? Broken down by endpoint.
    - Error rate: 5xx per minute over the last 2 hours.
    - DB metrics: connection pool utilization, slow query log (top 10 from `pg_stat_statements`), replication lag (if applicable).
    - Redis metrics: memory usage, hit rate, evictions per minute.
30. `(admin)/system/feature-flags/page.tsx` — grid of all platform + per-org feature flags with toggles. Changes are immediate (with Redis invalidation) and audit-logged.
31. `(admin)/system/templates/page.tsx` — manage the global template library (`templates` table). Create, edit, preview, publish/unpublish, reorder, archive templates. Permission-gated by `system:manage_templates`.

### Phase 9 — Audit Log Surface

32. `(admin)/audit/page.tsx` — the platform audit log viewer. This is the most-visited page during an incident response.
    - Search by actor (user email), resource_id, action, date range.
    - Filter by action category (user / org / billing / system / impersonation).
    - Each row: timestamp, actor, action, resource, impersonation flag, IP, user-agent abbreviation.
    - Click any row to expand and see the full `changes` JSONB payload.
    - Export to CSV for compliance inquiries.
33. **Audit integrity**: the audit_log is append-only in the schema (no UPDATE/DELETE permitted for `forge_app` role; only `forge_owner` can modify). Enforced via Postgres GRANT statements in a migration.
34. **Retention**: audit logs never auto-purge. Grows unbounded but compressible — annual partitioning via pg_partman with no retention window. For orgs that are deleted, their audit entries are pseudo-anonymized (`organization_id → NULL` with a hash) to preserve audit integrity while respecting deletion intent.

### Phase 10 — Analytics Consolidation

35. `(admin)/analytics/page.tsx` — platform-level analytics layered on GL-01's event data (queried cross-tenant via admin DB session):
    - **Acquisition**: signups by day, by source (UTM), by referrer.
    - **Activation**: signup-to-first-page-published funnel for the last 30 days' signups.
    - **Retention**: platform-wide weekly retention cohort grid.
    - **Engagement**: top pages by visitor count, top workflows by creation rate.
    - **Support**: orgs with active quality-degraded runs, orgs with recent error spikes.
36. A "pull-the-lever" interface for exporting any platform-wide analytics slice as CSV — same export engine as GL-01 but cross-tenant.

### Phase 11 — Billing & MRR Surface

37. `(admin)/billing/page.tsx` — revenue dashboard:
    - Current MRR / ARR — computed from `organizations` joined with Stripe subscription data cached locally.
    - MRR decomposition: new, expansion, contraction, churned, reactivated (the 5-component breakdown).
    - Churn rate (monthly and annual) — calculated as churned MRR / starting MRR.
    - Expansion rate — plan upgrades within existing orgs.
    - ARPU — Average Revenue Per User.
    - Cohort LTV — revenue curve per signup-month cohort, cumulative.
    - Trial conversion — % of trials that convert to paid.
    - Failed-payment surface — orgs with active `invoice.payment_failed` state; one-click-re-send action.
38. `(admin)/billing/refunds/page.tsx` — recent refunds + issue-refund interface. Refund action requires fresh auth + written reason + Super-Admin or Billing role. Triggers Stripe refund API + emails Owner + audit entry.
39. `(admin)/billing/invoices/page.tsx` — searchable invoice list across all orgs. Click any invoice to see detail + link to Stripe dashboard.

### Phase 12 — Launch Posture Page (Brian's One-Click "How Are We Doing" View)

40. `(admin)/overview/pulse/page.tsx` — a single-screen "founder pulse" view meant to answer "is Forge healthy?" in 30 seconds:
    - **Green/yellow/red banner** at the top computed from: any critical service down (red), any rate > 2σ from recent average (yellow), else green.
    - **Today's numbers**: signups today, active orgs today, pages created today, submissions received today, $ spent on LLM today, $ earned today (gross new MRR).
    - **This week's trend**: 7-day spark lines for each of the above.
    - **New since you last visited**: signups, pages, proposals accepted, first-submission events. Uses the current user's last-admin-visit timestamp.
    - **Attention needed**: list of 0–5 items that want Brian's attention — a customer with an angry email, an LLM cost spike, a degraded service, a stuck export job.
41. This is bookmarkable and the default post-login landing for any user with a platform role.

### Phase 13 — Mobile Read-Only Admin

42. The admin surface is read-only on mobile (screens < 768px). Brian can check metrics on his phone but can't perform destructive actions — prevents accidental impersonation/suspend/delete from a pocket.
43. The mobile admin layout is a vertical stack with the Pulse view as the default; other sections accessible via a sidebar sheet.

### Phase 14 — Tests

44. Permission matrix test: for each role, for each `/admin/*` endpoint, verify allowed/denied correctly.
45. Fresh-auth test: sensitive endpoints require reauth within 15 min.
46. Impersonation test: start → action → exit; verify every intermediate audit entry is correctly tagged.
47. Cross-tenant data isolation test: a non-admin logged in as user A MUST NOT be able to access `/admin/*` at all (403). A Support role MUST be able to read orgs but not suspend them.
48. LLM cost rollup test: seed known `orchestration_runs` data, verify `llm_cost_daily` materialized view produces correct totals.
49. Visual regression: snapshot the Pulse page, Org Detail, LLM Overview, Audit Log.
50. Load test: admin dashboards with 10,000+ orgs and 1M+ events perform in under 1s p95.
51. Role grant race: two super admins simultaneously grant roles to the same user — no duplicate entries, both grants reflected.

### Phase 15 — Documentation

52. `docs/architecture/PLATFORM_RBAC.md` — the permission + role + user-role schema, middleware, how to add a new permission, how roles extend.
53. `docs/runbooks/ADMIN_BOOTSTRAP.md` — grant the first Super Admin via DB shell, create the first Support user, rotate platform credentials.
54. `docs/runbooks/ADMIN_INCIDENT_RESPONSE.md` — what to check when a customer reports an issue; how to impersonate safely; how to interpret LLM cost anomalies; how to issue a refund correctly.
55. `docs/user/ADMIN_GUIDE.md` — for support team members: what each admin page does and when to use it.
56. Mission report.

---

## Acceptance Criteria

- Platform RBAC schema supports roles, permissions, and role-user assignments with expiry.
- 5 default roles (Super Admin, Admin, Support, Analyst, Billing) exist with correct permission bundles.
- `require_platform_permission` middleware gates every `/admin/*` endpoint.
- Sensitive actions require fresh auth within 15 minutes.
- Admin shell is visually distinct from the customer app and navigation hides items the user can't use.
- Overview dashboard shows traffic, signups, MRR, LLM cost, and health in one view.
- Organizations surface supports search, filter, and detail drill-down with quick actions.
- Impersonation flow with reason capture and prominent banner works end-to-end.
- LLM observability surface breaks down cost by provider, model, role, workflow, org, user, and page.
- System health page shows all service statuses and queue metrics.
- Audit log is append-only, searchable, exportable.
- Pulse page answers "how is Forge doing" in 30 seconds.
- Mobile admin is read-only.
- All tests pass including permission matrix and cross-tenant isolation.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
