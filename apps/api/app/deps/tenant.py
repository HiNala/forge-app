"""Resolve active organization + membership role (BI-02)."""

from __future__ import annotations

from uuid import UUID

from fastapi import Depends, HTTPException, Request
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Membership, Organization, User
from app.db.session import AsyncSessionLocal
from app.deps.auth import require_user

# Canonical headers (case-insensitive in HTTP); tests use ``x-forge-*``.
_ACTIVE_ORG_HEADERS = (
    "x-forge-active-org-id",
    "x-forge-tenant-id",
    "x-active-org",
)


def raw_active_organization_id(request: Request) -> str | None:
    """First non-empty org hint from headers, optional query (non-prod), or subdomain slug."""
    for key in _ACTIVE_ORG_HEADERS:
        v = request.headers.get(key)
        if v and v.strip():
            return v.strip()

    if settings.ALLOW_ORG_QUERY_PARAM and settings.ENVIRONMENT != "production":
        q = request.query_params.get("org")
        if q and q.strip():
            return q.strip()

    host = (request.headers.get("host") or "").split(":")[0].lower()
    root = (settings.APP_ROOT_DOMAIN or "").lower().strip()
    if root and host.endswith(f".{root}") and host != root:
        slug = host[: -(len(root) + 1)]
        if slug and slug != "www":
            return f"slug:{slug}"
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


async def _resolve_org_id_from_hint(session: AsyncSession, raw: str) -> UUID | None:
    if raw.startswith("slug:"):
        slug = raw.removeprefix("slug:")
        row = (
            await session.execute(select(Organization.id).where(Organization.slug == slug))
        ).scalar_one_or_none()
        return row
    try:
        return UUID(raw)
    except ValueError:
        return None


async def optional_tenant(
    request: Request,
    user: User = Depends(require_user),
) -> TenantContext | None:
    """Resolve org from header / subdomain / single membership; set ``request.state.tenant_id``."""
    if getattr(request.state, "auth_kind", None) == "api_token":
        tid = getattr(request.state, "tenant_id", None)
        role = getattr(request.state, "membership_role", None)
        if isinstance(tid, UUID) and isinstance(role, str):
            return TenantContext(organization_id=tid, role=role)
        return None

    raw = raw_active_organization_id(request)

    async with AsyncSessionLocal() as session:
        await session.execute(
            text("SELECT set_config('app.current_user_id', :u, true)"),
            {"u": str(user.id)},
        )

        if not raw:
            n_orgs = (
                await session.scalar(
                    select(func.count()).select_from(Membership).where(Membership.user_id == user.id)
                )
            ) or 0
            if int(n_orgs) == 1:
                m = (
                    await session.execute(select(Membership).where(Membership.user_id == user.id).limit(1))
                ).scalar_one_or_none()
                if m is not None:
                    org = await session.get(Organization, m.organization_id)
                    if org is not None and org.deleted_at is None:
                        request.state.tenant_id = m.organization_id
                        request.state.membership_role = m.role
                        return TenantContext(organization_id=m.organization_id, role=m.role)
            request.state.tenant_id = None
            request.state.membership_role = None
            return None

        org_id = await _resolve_org_id_from_hint(session, raw)
        if org_id is None:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "invalid_organization",
                    "message": "Invalid organization",
                },
            )

        m = await _load_membership(session, user_id=user.id, organization_id=org_id)
        if m is None:
            raise HTTPException(
                status_code=403,
                detail={"code": "not_a_member", "message": "Not a member of this organization"},
            )

        org = await session.get(Organization, org_id)
        if org is None or org.deleted_at is not None:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "organization_not_found",
                    "message": "Organization not found",
                },
            )

        request.state.tenant_id = org_id
        request.state.membership_role = m.role
        return TenantContext(organization_id=org_id, role=m.role)


async def require_tenant(
    request: Request,
    user: User = Depends(require_user),
    ctx: TenantContext | None = Depends(optional_tenant),
) -> TenantContext:
    if ctx is None:
        async with AsyncSessionLocal() as session:
            n_orgs = int(
                (
                    await session.scalar(
                        select(func.count()).select_from(Membership).where(Membership.user_id == user.id)
                    )
                )
                or 0
            )
        if n_orgs > 1:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "org_not_specified",
                    "message": "Active organization required (multi-org user)",
                },
            )
        raise HTTPException(
            status_code=400,
            detail={
                "code": "org_not_specified",
                "message": f"Missing {_ACTIVE_ORG_HEADERS[0]} header",
            },
        )
    return ctx
