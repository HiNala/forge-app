# Billing (Stripe)

## Products and prices

1. In the [Stripe Dashboard](https://dashboard.stripe.com) (test mode first), create products aligned with `app/services/billing_plans.py` (Starter, Pro; Enterprise is sales-led).
2. Create recurring prices for each tier and copy **Price IDs** into API settings:
   - `STRIPE_PRICE_STARTER`
   - `STRIPE_PRICE_PRO`
3. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `APP_PUBLIC_URL` on the API service. Checkout and portal URLs redirect back to the app using `APP_PUBLIC_URL`.

## Customer portal

Enable the **Billing customer portal** in Stripe (Settings → Billing → Customer portal). Subscribers use `POST /api/v1/billing/portal`, which returns a Stripe-hosted URL for payment method updates, cancellation, and plan changes where configured.

## Webhooks

1. Add endpoint `POST /api/v1/billing/webhook` (no auth; signature verified with `STRIPE_WEBHOOK_SECRET`).
2. Subscribe to at least: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`, `customer.subscription.trial_will_end` (optional email).
3. Events are deduplicated in `stripe_events_processed` (idempotent retries).

### Local testing with Stripe CLI

```bash
stripe login
stripe listen --forward-to localhost:8000/api/v1/billing/webhook
```

Use the CLI’s **signing secret** as `STRIPE_WEBHOOK_SECRET` in your local `.env`. Trigger test events from the Dashboard or `stripe trigger checkout.session.completed`.

## Stuck subscriptions

- **Webhook delivery failures**: Stripe retries automatically; check Dashboard → Developers → Webhooks → endpoint logs.
- **Org plan out of sync**: confirm the org has `stripe_customer_id` / `stripe_subscription_id`; replay the event from the Dashboard after fixing data, or run a one-off script to read subscription status from Stripe and patch `organizations.plan` (coordinate with engineering).
- **Payment failed banner**: `organizations.payment_failed_at` is set on `invoice.payment_failed` and cleared on `invoice.payment_succeeded`; clear manually only if you have verified payment outside Stripe.
