# Credit system (Forge Credits)

**Scope:** V2 P-04 — appends to `docs/billing/PRICING_MODEL.md` for the business definition.

## Data

- **Organization** holds rolling **denormalized** counters (fast reads): `credits_consumed_session`, `credits_consumed_week`, `session_window_start`, `week_window_start`, plus **extra-usage** flags when enabled.
- **`credit_ledger`** is **append-only** (no UPDATE/DELETE in app; DB role can forbid writes that mutate history). One row per charge with `action`, `credits_charged`, token stats, and provider for audit.
- `subscription_usage` (monthly) remains for **pages/submissions/tokens** month buckets; credits are **orthogonal** to calendar month (session/week are rolling).

## Services

- `app/services/billing/credit_windows.py` — `ensure_rolling_windows` resets session/week consumption when 5h / 7d have elapsed from `session_window_start` / `week_window_start`.
- `app/services/billing/credits.py` — `compute_charge`, `check_balance`, `apply_charge` (row lock on org, ledger insert, rollups).
- `credit_tier_for_plan` maps `plan` + trial → one of `free` | `pro` | `max_5x` | `max_20x` (see code for legacy `starter` / `enterprise`).

## API

- `GET /api/v1/billing/usage` extends `BillingUsageOut` with credit session/week fields and reset timestamps (ISO 8601).

## Orchestration (future hard gate)

- Before LLM: `check_balance` with planned charge; if not allowed and no extra-usage, **402** with copy from PRICING_MODEL.  
- After success: `apply_charge` with actual action; failed runs **no charge** (or prorated if we add token-based proration later).

## Runbooks

- `docs/runbooks/PRICING_INCIDENTS.md` — *to be expanded when ops patterns stabilize.*
- `docs/runbooks/PRICING_CHANGES.md` — *id.*
