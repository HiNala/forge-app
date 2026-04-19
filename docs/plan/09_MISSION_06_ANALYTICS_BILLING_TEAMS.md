# MISSION 06 — Analytics, Billing & Team Polish

**Goal:** Give Lucy the three things that convert Forge from "a tool I use once" into "a tool I pay for every month." Analytics that tell her whether her pages are working. Billing that lets her upgrade without friction. Team management polished enough that inviting her boss or a contractor feels obvious. After this mission, Forge is a commercial product — every revenue loop is wired, every metric a paying customer would look at is captured and displayed.

**Branch:** `mission-06-analytics-billing-teams`
**Prerequisites:** Missions 04 and 05 complete. Submissions arrive; automations fire; `analytics_events` is being written on page views and form events.
**Estimated scope:** Medium. Three distinct subsystems, each moderately sized.

---

## How To Run This Mission

Read the User Case Reports flows 5, 7, and 10 before starting — analytics for forms, analytics for proposals, and team management are each subtly different in what the user cares about. A booking form's key metric is "how many submissions did I get this week"; a proposal's key metric is "did the client scroll to the end and click accept"; a landing page's key metric is "how many unique visitors clicked the CTA." The analytics UI must adapt to the page type without feeling like three different products. Apply the mixture-of-experts lens here — Jobs (surface one number that matters), Tufte (data ink ratio), Ive (restraint).

A word on fake metrics, one more time: if the data isn't there, we show the empty state. No hardcoded "average 12 minutes on page." Only real numbers from real events. This is non-negotiable and it is why we partitioned `analytics_events` correctly back in Mission 01.

Commit on milestones: event ingestion hardened, summary dashboards live, funnel analysis working, Stripe checkout flow live, webhook handling, team UI polished.

**Do not stop until every item is verified complete. Do not stop until every item is verified complete. Do not stop until every item is verified complete.**

---

## TODO List

### Phase 1 — Event Ingestion Hardening

1. Review the `POST /p/{slug}/track` endpoint from Mission 04. Harden it: accept a batch of events (up to 10 per request) to reduce network chatter from the client beacon.
2. Client-side tracker (a tiny 1–2KB vanilla JS snippet injected into every published page) records:
    - `page_view` on load
    - `section_dwell` on IntersectionObserver triggers (only sections with `data-forge-section` attribute; record dwell ms when section leaves viewport)
    - `cta_click` when any element with `data-forge-cta` is clicked
    - `form_start` on first focus of any form input
    - `form_field_touch` on blur of each field (to measure drop-off per field)
    - `form_abandon` on `beforeunload` if form_start was fired but form_submit was not
    - `form_submit` on successful submission
    - `proposal_accept` / `proposal_decline` on specific CTA clicks for proposal pages
3. The tracker buffers events in-memory and flushes every 3 seconds or on page unload via `navigator.sendBeacon()`.
4. All tracked events use a `visitor_id` stored in a first-party cookie with a 1-year TTL, `SameSite=Lax`, not linked to any PII. GDPR-safe.
5. Session ID rotates every 30 minutes of inactivity.
6. Rate limit: 60 events/min per IP on `/p/{slug}/track`. Reject with 429.
7. Write events to `analytics_events` in a single INSERT per batch. Use `executemany` for efficiency.
8. Add a background worker job `purge_old_analytics` that drops partitions older than the plan's retention window (default 90 days, Pro 180, Enterprise 365). Runs daily.

### Phase 2 — Analytics Aggregation & Queries

9. Design the aggregation queries. These are optimized SQL — test with EXPLAIN ANALYZE on 1M-row partitions.
    - **Page summary** — unique visitors, total views, submissions, submission rate, top referrers, top devices — last 7 / 30 / 90 days.
    - **Form funnel** — `form_start` → `form_field_touch` (per field, grouped) → `form_submit` → drop-off percentage at each step.
    - **Proposal engagement** — views, unique visitors, max scroll depth distribution, accept rate, decline rate, average time-on-page (weighted by view).
    - **Org summary** — aggregate across all pages: total views, total submissions, cost per tenant (from subscription_usage).
10. Cache summary results in Redis with a 5-minute TTL. Invalidate on new page publish. Low-latency is the goal; stale by 5 min is fine.
11. Implement endpoints:
    - `GET /api/v1/pages/{page_id}/analytics/summary?range=7d|30d|90d`
    - `GET /api/v1/pages/{page_id}/analytics/funnel` — form pages only; 404 on non-form
    - `GET /api/v1/pages/{page_id}/analytics/engagement` — proposal pages only
    - `GET /api/v1/pages/{page_id}/analytics/events?cursor=...` — paginated raw event stream for debugging
    - `GET /api/v1/analytics/summary` — org-wide

### Phase 3 — Analytics UI

12. Build the Page Detail → Analytics tab. The layout adapts to `page_type`:
    - For form pages: hero KPI row (Views / Unique / Submissions / Rate), funnel visualization, field drop-off table, traffic sources.
    - For proposal pages: hero KPI row (Views / Unique / Max scroll / Accepted), scroll-depth histogram, section-dwell heatmap, device breakdown.
    - For landing pages: hero KPI row (Views / Unique / CTA clicks / Conversion), referrer list, device breakdown.
13. Use Recharts (already in the Next.js bundle via shadcn) for all visualizations. Keep them simple: line chart for trends, horizontal bar for funnels, list with percent bars for categorical data. Respect the design system's accent colors.
14. Empty state: if zero events, show a centered message with a "Share your page" CTA instead of empty charts. No fake data. Ever.
15. Build the org-wide Analytics page at `(app)/analytics/page.tsx`. Shows aggregate across all pages with a filter for page selection. Big number at the top is "Total submissions this month." Secondary numbers are "Pages live" and "Team members active."
16. Range selector: 7 / 30 / 90 days. URL-synced so sharing a link preserves range.
17. Export: "Download CSV" button produces a CSV of the current view's data.

### Phase 4 — Stripe Billing Setup

18. Set up a Stripe account, create two products:
    - **Starter** — $19/month, 20 pages, 500 submissions/month, basic analytics, 1 team seat.
    - **Pro** — $49/month, 200 pages, 10k submissions/month, full analytics, 10 team seats, custom domain.
    - **Enterprise** — contact sales (manual); no self-serve.
19. Configure customer portal in Stripe — cancel, change plan, update payment method handled by Stripe-hosted portal.
20. Implement `POST /api/v1/billing/checkout` — creates a Stripe Checkout Session for the selected plan, returns the URL. Uses `client_reference_id` = organization_id. On success, redirects to `/settings/billing?success=true`. On cancel, `/pricing?cancelled=true`.
21. Implement `POST /api/v1/billing/portal` — creates a customer portal session for the org's Stripe customer, returns the URL.
22. Implement `GET /api/v1/billing/plan` — returns current plan, status (active / trialing / past_due / cancelled), next invoice date, payment method last4.
23. Implement `GET /api/v1/billing/usage` — current period's usage against quotas: pages generated, submissions received, AI tokens consumed. Show percent remaining.

### Phase 5 — Stripe Webhooks

24. Implement `POST /api/v1/billing/webhook` — the critical endpoint. No auth. Verify signature against `STRIPE_WEBHOOK_SECRET`. Handle events:
    - `checkout.session.completed` — attach `stripe_customer_id` + `stripe_subscription_id` to the org, flip plan to the purchased tier.
    - `customer.subscription.updated` — on plan change, update `plan` field.
    - `customer.subscription.deleted` — flip plan to `starter` (or `cancelled` if policy changes), schedule page freeze in 30 days via worker job.
    - `invoice.payment_failed` — send billing_failed email via Resend; add sticky banner to Dashboard.
    - `invoice.payment_succeeded` — clear any payment-failed state.
    - `customer.subscription.trial_will_end` — send a reminder email 3 days before trial ends.
25. All webhook handlers are idempotent (check for event ID already processed in a `stripe_events_processed` small table with retention 30 days).
26. Webhook processing happens synchronously in the request (per Stripe's best practice for signature-authenticated webhooks). Timeouts are set to 10s. If any handler is slow, refactor to enqueue + 200-immediate.

### Phase 6 — Quota Enforcement

27. Create a `BillingGate` utility: `check_quota(org, action)` raises `QuotaExceededError` if the org has hit their plan's limit for the given action.
28. Wrap relevant endpoints: Studio generate (check `pages_generated_this_month`), Submissions create (check `submissions_this_month`), Custom domain setup (check plan allows custom domain).
29. Quota-exceeded responses return 402 with a consistent body:
    ```json
    {"code":"quota_exceeded","metric":"submissions","current":500,"limit":500,"upgrade_url":"/settings/billing"}
    ```
30. UI: when a generate is blocked, show a modal explaining the quota with a "Upgrade to Pro" primary action.
31. Dashboard: always show the current usage as a thin progress bar under the org name in the sidebar. Turns amber at 80%, red at 100%.

### Phase 7 — Pricing Page

32. Build `(marketing)/pricing/page.tsx` — three-tier grid card layout, highlighted recommended plan, feature comparison, FAQ, CTA to signup (Starter) or contact (Enterprise). Matches the marketing site's existing aesthetic.
33. "Start free trial" CTA → signup → onboarding → Dashboard with 14-day Pro trial active (no card required).
34. Pricing page is static-rendered and fast.

### Phase 8 — Team Management Polish

35. Revisit `(app)/settings/team/page.tsx` from Mission 02. Polish:
    - Avatar + display name + email + role + last active date + actions column.
    - Pending invitations section below active members with "Resend" and "Cancel" actions.
    - Invite form supports pasting multiple emails separated by commas; creates one invitation per email.
    - Role change via inline dropdown with optimistic update.
    - Remove member confirmation modal showing what the removed user loses access to.
36. Add a "Transfer ownership" flow: Owner picks another member, confirms with password re-entry, the target member becomes Owner and the original Owner becomes Editor. Rare flow but essential for acquisitions/departures.
37. Plan-based seat limits: show "X of Y seats used" next to the invite form. Disable invite if at limit, show upgrade CTA.

### Phase 9 — Observability

38. Add admin-only view `(app)/admin/page.tsx` (gated on a custom `is_admin` claim set only on Digital Studio Labs internal users). Shows: total orgs, active subs per tier, MRR, LLM tokens consumed this month, top-10 orgs by usage. Backed by `GET /api/v1/admin/*` endpoints.
39. Instrument Stripe events to PostHog (our internal product analytics, separate from user-facing page analytics). Track: trial_started, checkout_started, checkout_completed, subscription_cancelled, plan_upgraded.

### Phase 10 — Tests & Docs

40. Test: event ingestion batch of 10 events persists correctly.
41. Test: analytics summary returns zero state cleanly for a brand-new page.
42. Test: funnel correctly computes drop-off with a handcrafted scenario (3 starts, 2 touches, 1 submit → 67% submit rate among starters).
43. Test: Stripe webhook for `checkout.session.completed` updates the org's plan (use a mocked Stripe event).
44. Test: quota-exceeded on submission create returns 402 and DOES NOT write a Submission.
45. Test: transfer ownership correctly flips roles atomically.
46. Write `docs/runbooks/BILLING.md`: setting up Stripe products, creating prices, testing webhooks locally with Stripe CLI, handling stuck subscriptions.
47. Write `docs/runbooks/ANALYTICS.md`: partition management, retention policy changes per plan, debugging missing events.
48. Mission report.

---

## Acceptance Criteria

- Analytics events flow from every published page into `analytics_events`; summaries display correctly within 5 minutes of the event.
- Form funnel correctly identifies drop-off per field.
- Proposal analytics show scroll depth and CTA clicks distinctly.
- Stripe checkout, portal, and subscription lifecycle all work end-to-end against Stripe test mode.
- Quota enforcement blocks over-plan actions with 402 and surfaces the upgrade path in the UI.
- Team invitations, role changes, and ownership transfer are all working and tested.
- No fake metrics anywhere in the UI. Every number comes from the database.
- All lint / typecheck / test pass.
- Mission report written.

---

## Repo tracking (living)

API + reporting + billing + teams: **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** (Mission **06** in *By mission document*) · Backend notes: [MISSION_06_REPORT.md](./MISSION_06_REPORT.md) · App surfaces: **[MISSION-FE-06-REPORT.md](./MISSION-FE-06-REPORT.md)** · UI snapshot: **[ui/FRONTEND_STATUS.md](./ui/FRONTEND_STATUS.md)**.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
