"""Redis cache helpers for analytics summaries (Mission 06)."""

from __future__ import annotations

import json
import logging
from typing import Any, cast
from uuid import UUID

logger = logging.getLogger(__name__)

TTL_SECONDS = 300


def summary_cache_key_page(page_id: UUID, range_key: str) -> str:
    return f"forge:analytics:page:{page_id}:summary:{range_key}"


def summary_cache_key_org(organization_id: UUID, range_key: str) -> str:
    return f"forge:analytics:org:{organization_id}:summary:{range_key}"


async def cache_get_json(r: Any, key: str) -> dict[str, Any] | None:
    try:
        raw = await r.get(key)
        if raw:
            return cast(dict[str, Any], json.loads(raw))
    except Exception as e:
        logger.warning("analytics cache read %s: %s", key, e)
    return None


async def cache_set_json(r: Any, key: str, data: dict[str, Any]) -> None:
    try:
        await r.setex(key, TTL_SECONDS, json.dumps(data))
    except Exception as e:
        logger.warning("analytics cache write %s: %s", key, e)


async def bust_page_and_org(r: Any, *, page_id: UUID, organization_id: UUID) -> None:
    if r is None:
        return
    try:
        for rng in ("7d", "30d", "90d"):
            await r.delete(summary_cache_key_page(page_id, rng))
            await r.delete(summary_cache_key_org(organization_id, rng))
    except Exception as e:
        logger.warning("analytics bust %s", e)
