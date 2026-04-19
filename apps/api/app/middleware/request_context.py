"""Request id + structlog context + :class:`RequestContext` lifecycle (BI-02)."""

from __future__ import annotations

import time
import uuid
from collections.abc import Awaitable, Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.context import RequestContext, reset_request_context, set_request_context


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Assign ``X-Request-ID``, bind contextvars, log request start/finish."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        rid = request.headers.get("x-request-id")
        if not rid or not rid.strip():
            rid = str(uuid.uuid4())
        request.state.request_id = rid

        ctx = RequestContext(request_id=rid)
        token = set_request_context(ctx)
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=rid)

        log = structlog.get_logger("http")
        t0 = time.perf_counter()
        log.info("http.request.started", method=request.method, path=request.url.path)
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = rid
            dt_ms = (time.perf_counter() - t0) * 1000.0
            log.info(
                "http.request.finished",
                method=request.method,
                path=request.url.path,
                duration_ms=round(dt_ms, 2),
                status_code=response.status_code,
            )
            return response
        finally:
            reset_request_context(token)
            structlog.contextvars.clear_contextvars()
