"""Inbound webhooks (Resend delivery events — Mission 05)."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from svix.webhooks import Webhook

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/resend")
async def resend_webhook(
    request: Request,
) -> dict[str, bool]:
    """Verify Svix signature (Resend) and acknowledge. Delivery analytics land in Mission 06+."""
    if not settings.RESEND_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured")
    payload = await request.body()
    headers = {k: v for k, v in request.headers.items()}
    try:
        wh = Webhook(settings.RESEND_WEBHOOK_SECRET)
        data: dict[str, Any] = wh.verify(payload, headers)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid webhook signature") from None

    et = data.get("type") or data.get("event")
    mid = None
    if isinstance(data.get("data"), dict):
        mid = data["data"].get("email_id") or data["data"].get("id")
    logger.info("resend webhook event=%s message_id=%s", et, mid)
    return {"ok": True}
