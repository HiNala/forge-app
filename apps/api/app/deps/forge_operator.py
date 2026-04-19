"""Allowlist for Mission 01 ``/admin/*`` — operator org(s) only (e.g. Digital Studio Labs)."""

from __future__ import annotations

from uuid import UUID

from fastapi import Depends, HTTPException

from app.config import settings
from app.deps.tenant import TenantContext, require_tenant


def _parse_operator_organization_ids() -> frozenset[UUID]:
    raw = (settings.FORGE_OPERATOR_ORG_IDS or "").strip()
    if not raw:
        return frozenset()
    ids: list[UUID] = []
    for part in raw.split(","):
        p = part.strip()
        if not p:
            continue
        try:
            ids.append(UUID(p))
        except ValueError:
            raise HTTPException(
                status_code=500,
                detail=f"Invalid UUID in FORGE_OPERATOR_ORG_IDS: {p}",
            ) from None
    return frozenset(ids)


async def require_forge_operator(ctx: TenantContext = Depends(require_tenant)) -> TenantContext:
    """403 unless the active org is allowlisted; 503 if allowlist is empty."""
    allowed = _parse_operator_organization_ids()
    if not allowed:
        raise HTTPException(
            status_code=503,
            detail="Operator API is not configured (set FORGE_OPERATOR_ORG_IDS)",
        )
    if ctx.organization_id not in allowed:
        raise HTTPException(status_code=403, detail="Not an operator organization")
    return ctx
