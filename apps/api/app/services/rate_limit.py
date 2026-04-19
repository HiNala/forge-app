"""Strict per-IP rate limit for team invite endpoint (10/min — 11th blocked)."""

from __future__ import annotations

import time

from fastapi import HTTPException, Request

from app.config import settings


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
