# MISSION AL-02 — Billing & Credits Report (2026-04-28)

## Completed

- Plan registry (`plans.py`), Stripe price normalization helpers, webhook reconciliation (`checkout.session.completed`, `customer.subscription.updated` metadata/price fallback, `invoice.paid`), extra-usage ledger + worker meter flushing, concurrency Redis slots Studio-wide, forge credit quota payload refresh, `/studio/estimate`, `/billing/extra-usage/cap`, production env validation tweaks, `.env.example` alignment, frontend `formatCurrency` helper + Vitest smoke.
- Cron `flush_stripe_credit_meters` + worker plumbing.

## Pending / Deferred

- Full Stripe webhook matrix (trial mail, disputes, disputed charges telemetry) pending dedicated ops hardening sprint.
- Playwright Stripe live-account E2E suite — requires Forge CI secrets provisioning.
- UI wiring for Usage hints + realtime credit SSE polish lives in follow-up UX slice.
