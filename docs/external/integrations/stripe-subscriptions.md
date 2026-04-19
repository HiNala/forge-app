# Stripe Subscriptions — Reference for Forge

**Version:** stripe-python 11.x
**Last researched:** 2026-04-19

## What Forge Uses

Stripe for billing: trial → starter → pro plans, checkout sessions, customer portal, webhook-driven lifecycle.

## Setup

```python
# app/services/stripe_service.py
import stripe
from app.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

async def create_checkout_session(org_id: str, price_id: str, success_url: str, cancel_url: str):
    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"org_id": org_id},
        subscription_data={"metadata": {"org_id": org_id}},
    )
    return session.url

async def create_portal_session(customer_id: str, return_url: str):
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return session.url
```

## Webhook Handling

```python
# app/api/v1/billing.py
@router.post("/billing/webhook")
async def stripe_webhook(request: Request, db: DbSession):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(401, "Invalid signature")

    match event["type"]:
        case "checkout.session.completed":
            session = event["data"]["object"]
            org_id = session["metadata"]["org_id"]
            # Update org with stripe_customer_id, stripe_subscription_id
            # Change plan from trial to starter/pro

        case "customer.subscription.updated":
            sub = event["data"]["object"]
            # Update plan status, handle downgrades

        case "customer.subscription.deleted":
            sub = event["data"]["object"]
            # Start 30-day grace period, then freeze pages

        case "invoice.payment_failed":
            invoice = event["data"]["object"]
            # Alert user, retry automatically via Stripe

    return {"received": True}
```

## Known Pitfalls

1. **Webhook signature verification**: Always verify. Never trust unverified webhook payloads.
2. **Idempotency**: Stripe may send the same event multiple times. Use event ID for dedup.
3. **Test mode**: Use `sk_test_` keys in development.
4. **Price IDs**: Create Products and Prices in Stripe Dashboard, reference by ID.

## Links
- [Stripe Python SDK](https://stripe.com/docs/api?lang=python)
- [Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Webhooks](https://stripe.com/docs/webhooks)
