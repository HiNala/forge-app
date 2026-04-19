"""Per-user rate limits for Studio generation (Mission 03)."""

from __future__ import annotations

import time
from uuid import UUID

from fastapi import HTTPException, Request

from app.config import settings
from app.db.models import Organization


def studio_generate_limit_for_plan(plan: str) -> int:
    p = (plan or "trial").lower()
    if p in ("pro", "enterprise"):
        return settings.STUDIO_GENERATE_PER_MINUTE_PRO
    return settings.STUDIO_GENERATE_PER_MINUTE_TRIAL


async def rate_limit_studio_generate(request: Request, *, user_id: UUID, plan: str) -> None:
    limit = studio_generate_limit_for_plan(plan)
    bucket = int(time.time() // 60)
    key = f"forge:rl:studio_gen:{user_id}:{bucket}"

    r = getattr(request.app.state, "redis", None)
    if r is None:
        return

    n = await r.incr(key)
    if n == 1:
        await r.expire(key, 90)
    if n > limit:
        raise HTTPException(
            status_code=429,
            detail="Studio generation rate limit — try again shortly.",
        )


async def org_plan_for_rate_limit(org: Organization) -> str:
    return org.plan or "trial"
