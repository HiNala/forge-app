"""Reject oversized request bodies using ``Content-Length`` and streaming defense (BI-02)."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp, Message, Receive

_DEFAULT_MAX = 10 * 1024 * 1024  # 10 MiB
_UPLOAD_MAX = 25 * 1024 * 1024  # 25 MiB for ``/api/v1/uploads/*``


class PayloadTooLarge(Exception):
    """Raised when the request body exceeds the configured limit (streaming path)."""


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: ASGIApp,
        default_max_bytes: int = _DEFAULT_MAX,
        upload_max_bytes: int = _UPLOAD_MAX,
    ) -> None:
        super().__init__(app)
        self.default_max_bytes = default_max_bytes
        self.upload_max_bytes = upload_max_bytes

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if request.method not in ("POST", "PUT", "PATCH"):
            return await call_next(request)

        path = request.url.path
        limit = self.upload_max_bytes if path.startswith("/api/v1/uploads") else self.default_max_bytes

        cl = request.headers.get("content-length")
        if cl:
            try:
                n = int(cl)
            except ValueError:
                return await call_next(request)
            if n > limit:
                return Response(
                    content='{"code":"payload_too_large","message":"Request body too large"}',
                    status_code=413,
                    media_type="application/json",
                )
            return await call_next(request)

        received = 0
        receive: Receive = request.scope["receive"]

        async def capped_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                body = message.get("body", b"") or b""
                received += len(body)
                if received > limit:
                    raise PayloadTooLarge()
            return message

        request.scope["receive"] = capped_receive
        try:
            return await call_next(request)
        except PayloadTooLarge:
            return Response(
                content='{"code":"payload_too_large","message":"Request body too large"}',
                status_code=413,
                media_type="application/json",
            )
