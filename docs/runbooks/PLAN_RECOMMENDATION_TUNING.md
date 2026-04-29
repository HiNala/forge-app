# Plan recommendation tuning (BP-04)

Nightly **`plan_recommendation_check`** (not yet deployed) should:

1. Aggregate last 30d spend **including** Forge Credit overages.
2. Compare against counterfactual list prices for adjacent tiers **in org currency**.
3. Emit a row only when **savings_cents ≥ max(500, 15% of observed spend)** — tune these constants from acceptance rates.

## Operations

If acceptance metrics are poor, first check **noise**: users on trial, paused subscriptions, churned workspaces. Then tighten savings floor before widening heuristics.
