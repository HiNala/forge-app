"""Anonymous hero demo — SSE stream, no auth, strict per-IP cooldown."""

from __future__ import annotations

import logging
import time
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from starlette.responses import StreamingResponse

from app.schemas.public_demo import PublicDemoRequest
from app.services.orchestration.demo_pipeline import stream_demo_page

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public", tags=["public"])

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}

# One successful demo stream per IP per 10 minutes (Mission FE-02)
_DEMO_COOLDOWN_SEC = 600
_local_demo_last: dict[str, float] = {}


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


async def _enforce_demo_cooldown(request: Request) -> None:
    ip = _client_ip(request)
    r: Any | None = getattr(request.app.state, "redis", None)
    if r is not None:
        try:
            key = f"pubdemo:{ip}"
            ok = await r.set(key, "1", nx=True, ex=_DEMO_COOLDOWN_SEC)
            if not ok:
                raise HTTPException(
                    status_code=429,
                    detail="Demo rate limit — try again in a few minutes.",
                )
            return
        except HTTPException:
            raise
        except Exception as e:
            logger.warning("pubdemo redis cooldown fallback: %s", e)

    now = time.time()
    last = _local_demo_last.get(ip)
    if last is not None and (now - last) < float(_DEMO_COOLDOWN_SEC):
        raise HTTPException(
            status_code=429,
            detail="Demo rate limit — try again in a few minutes.",
        )
    _local_demo_last[ip] = now


@router.post("/demo")
async def public_demo_stream(request: Request, body: PublicDemoRequest) -> StreamingResponse:
    await _enforce_demo_cooldown(request)

    async def gen() -> AsyncIterator[bytes]:
        async for chunk in stream_demo_page(prompt=body.prompt, provider=body.provider):
            yield chunk

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )
