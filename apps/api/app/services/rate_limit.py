"""Strict per-IP rate limit for team invite endpoint (10/min — 11th blocked)."""

from __future__ import annotations

import time
from typing import Any

from fastapi import HTTPException, Request

from app.config import settings
from app.core.ip import get_client_ip


async def rate_limit_team_invite(request: Request) -> None:
    limit = settings.TEAM_INVITE_RATE_LIMIT_PER_MINUTE
    ip = request.client.host if request.client else "unknown"
    bucket = int(time.time() // 60)
    key = f"forge:rl:team_invite:{ip}:{bucket}"

    r = getattr(request.app.state, "redis", None)
    if r is None:
        return

    n = await r.incr(key)
    if n == 1:
        await r.expire(key, 90)
    if n > limit:
        raise HTTPException(status_code=429, detail="Too many invites — try again later")


_PUBLIC_TRACK_EVENTS_PER_MINUTE = 60


async def rate_limit_public_track_event_budget(request: Request, event_count: int) -> None:
    """Cap total analytics events per IP at ``_PUBLIC_TRACK_EVENTS_PER_MINUTE`` per rolling minute."""
    if event_count <= 0:
        return
    if settings.ENVIRONMENT == "test" and not (
        settings.FORCE_RATE_LIMIT_IN_TESTS or settings.RATE_LIMIT_IN_TESTS
    ):
        return

    ip = get_client_ip(request)
    minute = int(time.time() // 60)
    key = f"forge:rl:ptrack:ev:{ip}:{minute}"
    r: Any | None = getattr(request.app.state, "redis", None)
    if r is None:
        return

    try:
        new_total = await r.incrby(key, event_count)
        if new_total == event_count:
            await r.expire(key, 120)
        if new_total > _PUBLIC_TRACK_EVENTS_PER_MINUTE:
            await r.decrby(key, event_count)
            raise HTTPException(
                status_code=429,
                detail={
                    "code": "rate_limited",
                    "retry_after_seconds": 60,
                    "message": "Too many analytics events",
                },
            )
    except HTTPException:
        raise
    except Exception:
        return
