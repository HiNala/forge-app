# Billing and Forge Credits (AL-02)

Forge **Credits** meter AI-heavy work (studio generations, edits). They reset on rolling **session** (~5 hours) and **weekly** (~7-day) windows. Plans set **caps** (`app/services/billing/plans.py`); Stripe holds paid subscriptions plus **metered** overage when `extra_usage_enabled` is true on the organization.

Surfaces:

- Stripe Checkout + Portal — `apps/api/app/api/v1/billing.py`.
- Paid tier price IDs live in `.env.example` (`STRIPE_PRICE_*`).
- Ledger — `credit_ledger` tracks each charge (`meter_overage_units` drives Stripe Billing Meter events processed by `flush_stripe_credit_meters`).
- Scheduled downgrades — `scheduled_plan_changes` rows; applying the Stripe downgrade at boundary is out-of-band worker follow-up beyond this doc.
