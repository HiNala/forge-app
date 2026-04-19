"""Stripe webhook verification — raw body required for signature check."""

from __future__ import annotations

import stripe
from stripe._error import SignatureVerificationError

from app.config import settings


class StripeWebhookError(Exception):
    """Invalid payload or signature."""


def verify_stripe_webhook_payload(*, payload: bytes, stripe_signature: str | None) -> None:
    """
    Validate ``Stripe-Signature`` when ``STRIPE_WEBHOOK_SECRET`` is set.

    With an empty secret (local dev), skips verification.
    """
    secret = (settings.STRIPE_WEBHOOK_SECRET or "").strip()
    if not secret:
        return
    if not stripe_signature:
        raise StripeWebhookError("Missing Stripe-Signature header")
    try:
        stripe.Webhook.construct_event(payload, stripe_signature, secret)
    except SignatureVerificationError as e:
        raise StripeWebhookError(str(e)) from e
