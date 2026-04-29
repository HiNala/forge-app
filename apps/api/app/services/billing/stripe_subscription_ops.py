"""Stripe subscription mutations — idempotency-aware (AL-02)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, cast

import stripe

from app.config import settings


def _sk() -> None:
    if not (settings.STRIPE_SECRET_KEY or "").strip():
        raise RuntimeError("Stripe is not configured")
    stripe.api_key = settings.STRIPE_SECRET_KEY


def subscription_current_period_end(subscription_obj: dict[str, Any]) -> datetime | None:
    ts = subscription_obj.get("current_period_end")
    if isinstance(ts, int):
        return datetime.fromtimestamp(ts, tz=UTC)
    return None


def stripe_subscription_modify_price(
    *,
    subscription_id: str,
    new_price_id: str,
    idempotency_key: str,
) -> dict[str, Any]:
    """Swap the first recurring subscription item price (single-plan SKUs); prorates on upgrade."""
    _sk()
    sub = cast(Any, stripe.Subscription.retrieve(subscription_id, expand=["items.data.price"]))
    sid = sub.get("id")
    items = ((sub.get("items") or {}).get("data")) or []
    if not items:
        raise RuntimeError("subscription_has_no_items")
    first_item = items[0]
    item_db_id = str(first_item.get("id"))
    merged = stripe.Subscription.modify(
        sid,
        items=[{"id": item_db_id, "price": new_price_id}],
        proration_behavior="create_prorations",
        idempotency_key=idempotency_key[:255],
    )
    return merged.to_dict()


def stripe_subscription_cancel_at_period_end(
    *,
    subscription_id: str,
    cancel: bool,
    idempotency_key: str,
) -> dict[str, Any]:
    _sk()
    merged = stripe.Subscription.modify(
        subscription_id,
        cancel_at_period_end=cancel,
        idempotency_key=idempotency_key[:255],
    )
    return merged.to_dict()


def stripe_subscription_fetch(subscription_id: str) -> dict[str, Any]:
    _sk()
    sub = cast(Any, stripe.Subscription.retrieve(subscription_id))
    data = sub.to_dict()
    return cast(dict[str, Any], data)
