"""Role-based access (Owner / Editor / Viewer)."""

from __future__ import annotations

from typing import Literal

from fastapi import Depends, HTTPException

from app.deps.tenant import TenantContext, require_tenant

RoleName = Literal["owner", "editor", "viewer"]


def require_role(*allowed: RoleName):
    """403 unless the active org membership role is in ``allowed``."""

    async def _inner(ctx: TenantContext = Depends(require_tenant)) -> TenantContext:
        if ctx.role not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return ctx

    return _inner
