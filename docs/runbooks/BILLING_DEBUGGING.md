# Billing Debugging

## User upgraded via Checkout but Forge still shows Free

1. Check Stripe Dashboard → Payments → webhook attempts for `/api/v1/billing/webhook`.
2. Look for `stripe_events_processed` duplicates — event idempotent skip is expected on retries.
3. Verify `organizations.stripe_subscription_id`, `stripe_customer_id`, `plan`.

## Surprise extra‑usage invoices

Inspect Billing Meter events (`forge.credit.consumed`) for the Stripe customer ID. Replay failed ledger pushes via worker job `flush_stripe_credit_meters`.

## Webhook 5xx spikes

Ensure `STRIPE_WEBHOOK_SECRET`, raw body middleware order, Postgres transactions commit (errors surface Stripe retries intentionally).
