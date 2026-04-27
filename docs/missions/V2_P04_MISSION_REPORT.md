# V2 Mission P-04 — Progress report

**Scope:** Free / Pro / Max (5x & 20x) model, Forge Credits, session + weekly usage UX, marketing pricing, and wiring toward orchestration.

## Done in this pass

- **`docs/billing/PRICING_MODEL.md`** — already canonical; referenced from README.
- **API:** `credits.py`, `credit_windows.py`, `usage_snapshot`, `BillingUsageOut` (credits + extra usage).
- **Web:** `UsageBar` (four bands + tooltip + a11y), `SessionUsageBattery` (top bar), `StudioSessionUsageStrip`, **Settings → Usage** rebuilt around session + weekly bars and plan context, **sidebar** org meter uses credits first, **Studio** pre-warnings, exhausted-state messaging, post-generation toast (~credits + headroom), **marketing pricing** (Free/Pro/Max with 5x/20x toggle, explainer, comparison table aligned to `PRICING_MODEL`).
- **OpenAPI / `schema.gen.ts`:** `BillingUsageOut` extended for credits fields.
- **README:** pricing summary + doc link.
- **Tests:** `UsageBar.test.tsx` (state colors + `TooltipProvider` + `matchMedia` mock).

## Remaining (follow-up work)

- Orchestration: `check_balance` / `apply_charge` on every real LLM path; proration on partial runs.
- Stripe: metered extra usage, period worker, one-time top-ups.
- **Admin LLM routing** page, `model_quality_metrics`, Redis cache invalidation.
- **DB:** RLS on `credit_ledger`, migration script Starter/Pro/Enterprise → new slugs (dry-run), concurrency queue.
- E2E for pricing page, usage bars, 402/ledger tests from mission checklist.

**Brian review:** numbers in `PRICING_MODEL.md` are still the tunable layer; structure is fixed in code and marketing copy in this pass.
