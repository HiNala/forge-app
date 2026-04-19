"""Redis dependency for OAuth state and rate keys."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request


def require_redis(request: Request) -> Any:
    r = getattr(request.app.state, "redis", None)
    if r is None:
        raise HTTPException(status_code=503, detail="Redis unavailable")
    return r
