"""Request-scoped context via :class:`contextvars.ContextVar` (BI-02)."""

from __future__ import annotations

from contextvars import ContextVar, Token
from dataclasses import dataclass, field
from typing import Any
from uuid import UUID


@dataclass
class RequestContext:
    """Propagates through ``structlog`` contextvars and DB session setup."""

    request_id: str
    user_id: UUID | None = None
    organization_id: UUID | None = None
    user_role: str | None = None
    is_admin: bool = False
    extra: dict[str, Any] = field(default_factory=dict)


_request_context: ContextVar[RequestContext | None] = ContextVar("forge_request_ctx", default=None)


def try_get_request_context() -> RequestContext | None:
    return _request_context.get()


def get_request_context() -> RequestContext:
    ctx = _request_context.get()
    if ctx is None:
        raise RuntimeError("request context not set")
    return ctx


def set_request_context(ctx: RequestContext) -> Token[RequestContext | None]:
    return _request_context.set(ctx)


def reset_request_context(token: Token[RequestContext | None]) -> None:
    _request_context.reset(token)
