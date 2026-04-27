# Pricing & credits incidents

## User says credits are wrong

1. Resolve `organization_id` and time range.
2. Query `credit_ledger` (append-only) `WHERE organization_id = ? ORDER BY created_at DESC` — verify sum of `credits_charged` vs org rollups.
3. If rollups diverge from ledger, treat rollup as recomputable from ledger (and fix bug in `apply_charge`).

## Session not resetting

1. Check `organizations.session_window_start` and `credits_consumed_session`.
2. `ensure_rolling_windows` should advance window when `now - session_window_start >= 5h` — if clock skew, use server UTC only.

## Extra usage or Stripe metered billing mis-billed

1. Check `extra_usage_spent_period_cents` vs Stripe usage records for the period.
2. Re-submit metered line items via Stripe dashboard or idempotent job retry (implementation-specific).

## Ledger integrity

- `credit_ledger` must never UPDATE/DELETE. If bad row was inserted, **compensate** with a new ledger row; do not delete.
