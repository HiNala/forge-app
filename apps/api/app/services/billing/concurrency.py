"""Redis-backed concurrent Studio generation caps per organization (AL-02 / V2-P04).

Uses a sorted set keyed by expiry timestamp; callers must ``release_slot`` after generation.
If the process crashes, entries age out (~120s) so stale slots recover automatically.
"""

from __future__ import annotations

import contextlib
import time
import uuid
from typing import Any
from uuid import UUID

from app.config import settings
from app.services.billing.pricing_catalog import concurrency_cap_for_plan, normalize_plan_slug

_SLOT_TTL_SEC = 125
_SLOT_KEY_PADDING_SEC = int(_SLOT_TTL_SEC * 10)


def _slot_key(org_id: UUID) -> str:
    return f"{settings.FORGE_CACHE_NS}:conc:{org_id}"


async def acquire_studio_slot(redis: Any | None, *, organization_id: UUID, raw_plan: str | None) -> str | None:
    """Acquire if under cap — returns opaque token string, otherwise ``None``."""
    if redis is None:
        return "__no_redis__"
    cap = concurrency_cap_for_plan(raw_plan or "trial")
    if cap <= 0:
        cap = 1
    key = _slot_key(organization_id)
    now = time.time()
    await redis.zremrangebyscore(key, 0, now - _SLOT_KEY_PADDING_SEC)
    current = await redis.zcard(key)
    if current >= cap:
        return None
    token = str(uuid.uuid4())
    await redis.zadd(key, {token: now + float(_SLOT_TTL_SEC)})
    await redis.expire(key, _SLOT_TTL_SEC * 2)
    return token


async def release_studio_slot(redis: Any | None, *, organization_id: UUID, token: str | None) -> None:
    if redis is None or not token or token == "__no_redis__":
        return
    key = _slot_key(organization_id)
    with contextlib.suppress(Exception):
        await redis.zrem(key, token)


def concurrency_detail_payload(*, capacity: int) -> dict[str, Any]:
    """HTTP 429 body when every slot is occupied."""
    return {
        "code": "quota_exceeded",
        "metric": "concurrency",
        "capacity": capacity,
        "upgrade_url": "/settings/billing",
        "detail": (
            "Your organization already has the maximum simultaneous generations for this plan. "
            "Wait for one to finish or upgrade for more concurrency."
        ),
    }


def capacity_for_org_plan(plan: str | None) -> int:
    return concurrency_cap_for_plan(normalize_plan_slug(plan or "free"))
