# Mission 06 — Analytics, Billing & Team Polish (report)

**Branch:** `mission-06-analytics-billing-teams`  
**Date:** 2026-04-18

## Summary

Mission 06 wires commercial loops: public analytics ingestion (batch track + tracker), aggregated summaries and specialized form/proposal views, Stripe checkout/portal/webhooks with idempotency, quota enforcement on submissions and related actions, team polish (invites, seats, ownership transfer), and dashboard UX (org analytics page, billing usage bar, no fabricated metrics).

## Verification

| Check | Command / note |
|--------|----------------|
| API tests | `cd apps/api && uv run pytest tests/` |
| API lint / types | `cd apps/api && uv run ruff check app && uv run mypy app` |
| Web | `cd apps/web && pnpm run typecheck && pnpm run lint` |

## Notable implementation details

- **Rate limiting**: `/p/.../track` is 60/min/IP; POST `/submit` and `/upload` use a dedicated key at 60/min/IP so integration tests and legitimate traffic are not starved by a single shared 10/min bucket for all `/p/*` routes.
- **Org analytics**: `GET /api/v1/analytics/summary` includes `views_by_day` for sparkline-style trends; UI at `/analytics` with range + optional page filter, CSV export of the current view.
- **Sidebar usage**: Plan usage bar under the workspace name uses `GET /api/v1/billing/usage` (submissions quota when available, else pages quota); amber at 80%, red at 100%.
- **Integrity**: Gallery-style page analytics use real CTA and view metrics only (no inferred “time on page” from views/uniques).

## Follow-ups (out of scope or partial)

- Stripe **live** products and Customer Portal configuration in production Dashboard.
- Admin dashboard and PostHog product analytics if not fully exercised in this branch.
- Pricing/marketing pages: confirm parity with design and 14-day trial policy in auth/onboarding.
