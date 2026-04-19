"""Internal product analytics (PostHog) — Mission 06."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def capture(distinct_id: str, event: str, properties: dict[str, Any] | None = None) -> None:
    key = (settings.POSTHOG_API_KEY or "").strip()
    if not key:
        return
    host = settings.POSTHOG_HOST.rstrip("/")
    payload = {
        "api_key": key,
        "event": event,
        "properties": {"distinct_id": distinct_id, **(properties or {})},
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(f"{host}/capture/", json=payload)
    except Exception as e:
        logger.warning("posthog capture %s: %s", event, e)
