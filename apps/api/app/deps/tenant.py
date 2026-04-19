"""Resolve active organization + membership role."""

from __future__ import annotations

from uuid import UUID

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Membership, Organization, User
from app.db.session import AsyncSessionLocal
from app.deps.auth import require_user

# Canonical header; `x-forge-tenant-id` is accepted as an alias (tests, tooling).
ACTIVE_ORG_HEADER = "x-forge-active-org-id"
_TENANT_ID_ALIAS = "x-forge-tenant-id"


def raw_active_organization_id(request: Request) -> str | None:
    """First non-empty value from org-scoped headers (same semantics everywhere)."""
    for key in (ACTIVE_ORG_HEADER, _TENANT_ID_ALIAS):
        v = request.headers.get(key)
        if v and v.strip():
            return v.strip()
    return None


class TenantContext:
    __slots__ = ("organization_id", "role")

    def __init__(self, organization_id: UUID, role: str) -> None:
        self.organization_id = organization_id
        self.role = role


async def _load_membership(
    session: AsyncSession,
    *,
    user_id: UUID,
    organization_id: UUID,
) -> Membership | None:
    return (
        await session.execute(
            select(Membership).where(
                Membership.user_id == user_id,
                Membership.organization_id == organization_id,
            )
        )
    ).scalar_one_or_none()


async def optional_tenant(
    request: Request,
    user: User = Depends(require_user),
) -> TenantContext | None:
    """Validate active org header when present; set ``request.state.tenant_id`` for RLS."""
    raw = raw_active_organization_id(request)
    if not raw:
        request.state.tenant_id = None
        request.state.membership_role = None
        return None
    try:
        org_id = UUID(raw)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid organization id") from e

    async with AsyncSessionLocal() as session:
        await session.execute(
            text("SELECT set_config('app.current_user_id', :u, true)"),
            {"u": str(user.id)},
        )
        m = await _load_membership(session, user_id=user.id, organization_id=org_id)
        if m is None:
            raise HTTPException(status_code=403, detail="Not a member of this organization")

        org = await session.get(Organization, org_id)
        if org is None or org.deleted_at is not None:
            raise HTTPException(status_code=404, detail="Organization not found")

    request.state.tenant_id = org_id
    request.state.membership_role = m.role
    return TenantContext(organization_id=org_id, role=m.role)


async def require_tenant(
    request: Request,
    ctx: TenantContext | None = Depends(optional_tenant),
) -> TenantContext:
    if ctx is None:
        raise HTTPException(
            status_code=400,
            detail=f"Missing {ACTIVE_ORG_HEADER} header",
        )
    return ctx
