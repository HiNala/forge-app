"""Outbound webhook dispatch — HMAC-signed HTTP POST on Forge events (BI-04)."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.outbound_webhook import OutboundWebhook

logger = logging.getLogger(__name__)

_CLIENT_TIMEOUT = 10.0


async def dispatch_webhook_event(
    db: AsyncSession,
    *,
    organization_id: UUID,
    event_type: str,
    payload: dict[str, Any],
) -> None:
    """Fire all active webhooks for an org that subscribe to event_type.

    Signs each request with HMAC-SHA256 via the webhook's secret so receivers
    can verify authenticity using the ``X-Forge-Signature: sha256=<hex>`` header.
    Failures are logged but never raise — webhook errors must not affect the caller.
    """
    rows = (
        await db.execute(
            select(OutboundWebhook).where(
                OutboundWebhook.organization_id == organization_id,
                OutboundWebhook.active.is_(True),
                OutboundWebhook.events.contains([event_type]),
            )
        )
    ).scalars().all()

    if not rows:
        return

    body = json.dumps(
        {
            "event": event_type,
            "timestamp": datetime.now(UTC).isoformat(),
            "data": payload,
        },
        default=str,
    ).encode()

    async with httpx.AsyncClient(timeout=_CLIENT_TIMEOUT) as client:
        for wh in rows:
            sig = hmac.new(wh.secret.encode(), body, hashlib.sha256).hexdigest()
            try:
                resp = await client.post(
                    wh.url,
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Forge-Event": event_type,
                        "X-Forge-Signature": f"sha256={sig}",
                    },
                )
                logger.info(
                    "webhook dispatch %s → %s status=%d", event_type, wh.url, resp.status_code
                )
            except Exception as e:  # noqa: BLE001
                logger.warning("webhook dispatch failed wh=%s: %s", wh.id, e)
