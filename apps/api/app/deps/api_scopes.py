"""Enforce API token scopes on routes (BI-04). JWT sessions bypass (implicit full access)."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import HTTPException, Request

from app.deps.auth import require_user


def require_api_scopes(*required: str) -> Callable[[Request], Awaitable[None]]:
    """Require each scope when ``auth_kind == api_token``.

    Always awaits :func:`require_user` so bearer resolution runs before we read
    ``request.state`` (nested ``Depends(require_user)`` is not ordered vs. ``get_db``).
    """

    async def _check(request: Request) -> None:
        await require_user(request)
        if getattr(request.state, "auth_kind", None) != "api_token":
            return
        tok = getattr(request.state, "api_token", None)
        if tok is None:
            raise HTTPException(status_code=401, detail="Not authenticated")
        scopes = set(tok.scopes or [])
        if "admin:all" in scopes:
            return
        for r in required:
            if r not in scopes:
                raise HTTPException(
                    status_code=403,
                    detail=f"API token missing required scope: {r}",
                )

    return _check
