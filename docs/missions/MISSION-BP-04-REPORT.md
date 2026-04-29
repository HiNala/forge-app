# MISSION BP-04 — Credit System Perfection (report)

**Status:** Partial delivery — core transparency paths implemented; several mission phases remain for follow-up releases.

## Shipped in this iteration

1. **Provisional `credit.charged` SSE** during product-brain orchestration (`agent`, `amount_credits`, `running_total`, `provisional: true`). Final billing still posts from `legacy_pipeline` as before.
2. **Studio empty-state estimate line** — debounced calls to `POST /studio/estimate` with calm copy (credits · money hint · seconds · confidence).
3. **Pre-action confirmation** for **generate** and **refine** (including quick refine chips) — `CreditConfirmDialog` + `shouldShowCreditConfirm` + persisted `credit_confirm_skip_under_credits` when the user opts in. Empty-state generate clears the prompt immediately after scheduling the run (`void` + reset).
4. **User preferences (server + UI)** — new JSONB fields on `UserPreferences` / `UserPreferencesPartial`; **Settings → Generation** page for auto-improve and confirmation threshold slider.
5. **Billing** — in-app banner when extra-usage spend crosses ~75% / ~95% / 100% of the monthly cap (when extra usage is enabled).
6. **`plan_recommendations` + `refund_requests` migrations** (`bp04_plan_rec_refunds`) and **`GET /billing/plan-recommendation`** / **`POST /billing/plan-recommendation/dismiss`** wired to Postgres; Stripe Checkout respects **`STRIPE_CHECKOUT_AUTOMATIC_TAX`** when enabled.
7. **Billing UI** — recommendation card when a row exists + dismiss + link to Stripe or **Settings → Billing → Plans**.
8. **In-app plans** — `/settings/billing/plans` with monthly/annual toggle calling **`POST /billing/checkout`** with the chosen `billing_interval`.
9. **Currency formatting** — JPY-style zero-decimal currencies in `formatCurrency`.
10. **Tests** — `credit-preaction.test.ts`; relaxed `formatPlural` typing in `format/numbers.ts`.

## Not yet implemented (explicit backlog)

- Nightly **plan recommendation** worker that inserts `plan_recommendations` rows (schema + API are ready).
- **Refund** queue workflows — admin `/admin/refunds`, auto-approve rules, Stripe `refunds.create` wiring (**`refund_requests` table migrated**).
- Stripe **Tax dashboard** onboarding + subscription-update paths beyond Checkout `automatic_tax` (coordinate env + Stripe).
- **Value summary** email + monthly digest worker.
- **Concurrency queue** UX (`queued` / `queued_proceeding` SSE) and Pro priority ordering.
- **Winback** pause/downgrade polish on cancel flow.
- **Admin billing** panels (MRR drilldowns, cohort retention, refund rate).
- Full **Phase 17** performance + E2E matrix (estimate p95, modal E2E, etc.).

## Adjacent fixes

- `formatPlural` types aligned with partial plural forms for unit tests.
- Billing usage banner uses plan currency for spend copy.

## Suggested branch

`mission-bp04-credit-perfection` (merge from main before large DB work).
