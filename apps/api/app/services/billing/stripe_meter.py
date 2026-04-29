"""Submit generation credit meter overage units to Stripe (Billing Meter API v2, AL-02)."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from stripe import StripeClient

from app.config import settings

logger = logging.getLogger(__name__)


def submit_meter_overage_units(
    *,
    stripe_customer_id: str,
    credit_units: int,
    ledger_id: int,
) -> tuple[bool, str | None]:
    """
    Return (ok, error_message). Uses idempotent ``identifier`` = ledger pk.
    Stripe Billing Meter must expose ``FORGE_CREDIT_METER_EVENT_NAME``.
    """
    if credit_units <= 0:
        return True, None
    key = (settings.STRIPE_SECRET_KEY or "").strip()
    if not key:
        return False, "stripe_not_configured"
    cid = stripe_customer_id.strip()
    try:
        event = (settings.FORGE_CREDIT_METER_EVENT_NAME or "forge.credit.consumed").strip()
        client = StripeClient(key)
        client.v2.billing.meter_events.create(
            {
                "event_name": event,
                "identifier": f"forge-ledger-{ledger_id}",
                "payload": {"stripe_customer_id": cid, "value": str(int(credit_units))},
            },
        )
    except Exception as e:  # noqa: BLE001 — Stripe raises typed errors across versions
        logger.warning("stripe meter event failed ledger=%s: %s", ledger_id, e)
        mod = getattr(type(e), "__module__", "") or ""
        msg = str(e)[:800]
        if mod.startswith("stripe") or "Stripe" in type(e).__name__:
            return False, msg
        return False, msg
    return True, None


def mark_meter_sent(snapshot: datetime | None = None) -> datetime:
    """Return timestamp to persist on ledger after successful Stripe write."""
    return snapshot or datetime.now(UTC)
