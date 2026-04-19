"""Redis cache for prefs/org settings — soft-fail when Redis is down."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import Request

from app.config import settings

logger = logging.getLogger(__name__)


def _ns() -> str:
    raw = (getattr(settings, "FORGE_CACHE_NS", None) or "forge").strip()
    return raw or "forge"


def prefs_key(user_id: str) -> str:
    return f"{_ns()}:prefs:user:{user_id}"


def org_settings_key(org_id: str) -> str:
    return f"{_ns()}:org:settings:{org_id}"


async def cache_get_json(request: Request, key: str) -> Any | None:
    r = getattr(request.app.state, "redis", None)
    if r is None:
        return None
    try:
        raw = await r.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as e:
        logger.warning("cache_get_json %s: %s", key, e)
        return None


async def cache_set_json(
    request: Request, key: str, value: Any, *, ttl_seconds: int
) -> None:
    r = getattr(request.app.state, "redis", None)
    if r is None:
        return
    try:
        await r.setex(key, ttl_seconds, json.dumps(value, default=str))
    except Exception as e:
        logger.warning("cache_set_json %s: %s", key, e)


async def cache_delete(request: Request, key: str) -> None:
    r = getattr(request.app.state, "redis", None)
    if r is None:
        return
    try:
        await r.delete(key)
    except Exception as e:
        logger.warning("cache_delete %s: %s", key, e)
