"""Early request hints for tenant (RLS vars are set in ``app.deps.db.get_db``)."""

from collections.abc import Awaitable, Callable
from uuid import UUID

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Keep in sync with ``app.deps.tenant`` (middleware must not import deps — import order).
_ORG_HEADER_KEYS = ("x-forge-active-org-id", "x-forge-tenant-id", "x-active-org")


def _raw_org_id_from_headers(request: Request) -> str | None:
    for key in _ORG_HEADER_KEYS:
        v = request.headers.get(key)
        if v and v.strip():
            return v.strip()
    return None


def _uuid_only(raw: str | None) -> str | None:
    if not raw or raw.startswith("slug:"):
        return None
    try:
        UUID(raw)
    except ValueError:
        return None
    return raw


class TenantMiddleware(BaseHTTPMiddleware):
    """Parse org UUID from headers so ``request.state`` is coherent before dependencies run."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        raw = _raw_org_id_from_headers(request)
        request.state.tenant_id = None
        uonly = _uuid_only(raw)
        if uonly:
            try:
                request.state.tenant_id = UUID(uonly)
            except ValueError:
                request.state.tenant_id = None
        return await call_next(request)
