"""Redis cache for availability slot lists (W-01)."""

from __future__ import annotations

import json
import logging
from datetime import date
from typing import Any
from uuid import UUID

logger = logging.getLogger(__name__)

TTL_SECONDS = 300
PREFIX = "availability"


def _key(calendar_id: UUID, d0: date, d1: date, duration: int) -> str:
    return f"{PREFIX}:{calendar_id}:{d0.isoformat()}:{d1.isoformat()}:{duration}"


async def get_cached_slots(
    redis: Any,
    *,
    calendar_id: UUID,
    date_from: date,
    date_to: date,
    duration: int,
) -> list[dict[str, Any]] | None:
    if redis is None:
        return None
    try:
        raw = await redis.get(_key(calendar_id, date_from, date_to, duration))
    except Exception as e:  # noqa: BLE001
        logger.debug("availability cache get: %s", e)
        return None
    if not raw:
        return None
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return data
    except json.JSONDecodeError:
        return None
    return None


async def set_cached_slots(
    redis: Any,
    *,
    calendar_id: UUID,
    date_from: date,
    date_to: date,
    duration: int,
    slots: list[dict[str, Any]],
) -> None:
    if redis is None:
        return
    try:
        await redis.setex(
            _key(calendar_id, date_from, date_to, duration),
            TTL_SECONDS,
            json.dumps(slots),
        )
    except Exception as e:  # noqa: BLE001
        logger.debug("availability cache set: %s", e)


async def invalidate_calendar_availability(redis: Any, calendar_id: UUID) -> None:
    """Remove cached slot lists for a calendar (pattern scan)."""
    if redis is None:
        return
    pattern = f"{PREFIX}:{calendar_id}:*"
    try:
        async for k in redis.scan_iter(match=pattern, count=50):
            await redis.delete(k)
    except Exception as e:  # noqa: BLE001
        logger.debug("availability cache invalidate: %s", e)
