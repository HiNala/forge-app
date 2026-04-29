# Credit system perfection (BP-04)

This document summarizes how Forge achieves **predictability and transparency** for Forge Credits beyond AL-02’s correctness guarantees.

## Predictive estimates

- **Endpoint**: `POST /api/v1/studio/estimate` returns `estimated_credits`, `estimated_cost_cents_hint`, `estimated_seconds`, and `confidence` (low | medium | high).
- **Studio (empty state)**: the prompt is debounced (400ms) and the response is shown as a quiet line under the textarea.
- **Cost hint**: `estimated_cost_cents_hint` uses the org’s credit tier overage rate from the server (`OVERAGE_RATES_CENTS_PER_CREDIT`).

## Pre-action confirmation

- **Client helper**: `shouldShowCreditConfirm` in `apps/web/src/lib/credit-preaction.ts` combines:
  - User preference `credit_confirm_skip_under_credits` (default 75) — estimates **below** this skip confirmation.
  - Five percent of current **session** cap in credits.
  - Dollar hint vs `credit_confirm_threshold_cents` (default 50 = $0.50).
  - Optional “squeeze” path when the user is deep into a session window.
- **UI**: `CreditConfirmDialog` — optional “don’t ask under N credits” raises `credit_confirm_skip_under_credits` via `PATCH /auth/me/preferences`.

## Live balance during streaming (provisional)

- **Orchestrator** (`stream_product_page_generation`): emits SSE `credit.charged` events with `provisional: true`, `amount_credits`, `agent`, and `running_total` as the graph progresses. **Ledger settlement** still happens in `legacy_pipeline` at the end of the run; provisional events are for UX only.
- **Studio footer**: `StudioSessionUsageStrip` shows a line when `streamingRunCredits > 0`.
- **Authoritative usage**: the final `credit.charged` event (no `provisional` flag) includes `usage` and updates React Query `billing-usage` as before.

## User preferences (JSONB)

Keys live on `users.user_preferences` (merged server-side):

| Key | Purpose |
| --- | --- |
| `forge_auto_improve` | BP-01 critic auto-refine toggles |
| `credit_confirm_threshold_cents` | Dollar-equivalent bar for confirmation |
| `credit_confirm_skip_under_credits` | Skip modal for small estimates |
| `credit_estimate_display` | `always` \| `big_only` \| `never` |
| `credit_post_action_toast` | Post-run toast density |
| `studio_concurrency_behavior` | `queue` \| `reject` (future queue UX) |

## Plan recommendation & refunds

- **API stub**: `GET /api/v1/billing/plan-recommendation` returns `{ "recommendation": null }` until the nightly worker and `plan_recommendations` table are wired.
- **Refund flow & Stripe Tax**: described in the BP-04 mission report as follow-up work; prefer Stripe primitives for tax, invoices, and refunds.

## Related code

- `apps/web/src/components/studio/studio-workspace.tsx` — estimate line, confirmation, provisional credits.
- `apps/api/app/services/orchestration/product_brain/orchestrator.py` — provisional SSE.
- `apps/web/src/app/(app)/settings/preferences/generation/page.tsx` — user-facing controls.
