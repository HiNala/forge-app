# V2 Mission P-04 — Progress report

**Scope:** Free / Pro / Max (5x & 20x) model, Forge Credits, session + weekly usage UX, marketing pricing, and wiring toward orchestration.

## Done (verified in codebase)

- **`docs/billing/PRICING_MODEL.md`** — canonical tier names, caps, credit table; tunable numbers.
- **`docs/architecture/CREDIT_SYSTEM.md`** — engineering reference for windows + charging.
- **API:** `app/services/billing/credits.py` (`check_balance`, `apply_charge`, `compute_studio_pipeline_credits`, tiers), `credit_windows.py`, usage on `Organization` / counters, `BillingUsageOut`.
- **Studio path:** `POST /studio/generate` and refine flow call **`check_balance`** before streaming (`studio.py`); successful pipeline completion calls **`apply_charge`** and emits SSE `credit.charged` (`orchestration/pipeline.py`).
- **Web:** `UsageBar`, session/weekly UX, Settings → Usage, sidebar meter, Studio warnings/toasts, marketing pricing (Free/Pro/Max, explainer, comparison).
- **Tests:** `test_forge_credits_balance.py`, `test_studio_mission03.py` (402 path), `UsageBar.test.tsx`.

## Remaining (mission checklist vs reality)

- **Partial runs / proration:** charge is on successful completion; mid-stream failure handling and proration per mission text are not fully modeled.
- **Stripe:** metered extra usage, period worker, one-time top-ups (mission Phase 7–8).
- **Admin LLM routing UI**, `model_quality_metrics`, advanced cache invalidation.
- **DB hardening:** RLS on `credit_ledger` if not already enforced for `forge_app`; Starter/Pro/Enterprise → new slug migration dry-run; concurrency queue UX (“hold on…”).
- **E2E:** pricing page, usage bars, ledger append-only audit, weekly-cap isolation tests (mission §11).
- **Human:** Brian sign-off on numbers in `PRICING_MODEL.md`.

**This report does not mark P-04 fully complete** against `docs/V2_P04_PRICING_CREDITS_RATE_LIMITS.md` — only records what is shipped and what is still open.
