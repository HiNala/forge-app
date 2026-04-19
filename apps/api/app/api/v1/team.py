from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Invitation, Membership, Organization, User
from app.deps import get_db, require_role, require_tenant
from app.deps.auth import require_user
from app.deps.db import get_db_user_only
from app.deps.tenant import TenantContext
from app.schemas.team import (
    AcceptInviteResponse,
    InviteBody,
    InviteResponse,
    MemberOut,
    PatchMemberBody,
)
from app.services.email_invite import send_team_invitation_email
from app.services.rate_limit import rate_limit_team_invite

router = APIRouter(prefix="/team", tags=["team"])


async def _owner_count(db: AsyncSession, organization_id: UUID) -> int:
    return int(
        await db.scalar(
            select(func.count())
            .select_from(Membership)
            .where(
                Membership.organization_id == organization_id,
                Membership.role == "owner",
            )
        )
        or 0
    )


@router.get("/members", response_model=list[MemberOut])
async def list_members(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> list[MemberOut]:
    rows = (
        await db.execute(
            select(Membership, User)
            .join(User, User.id == Membership.user_id)
            .where(Membership.organization_id == ctx.organization_id)
        )
    ).all()
    out: list[MemberOut] = []
    for m, u in rows:
        out.append(
            MemberOut(
                id=m.id,
                user_id=u.id,
                email=str(u.email),
                display_name=u.display_name,
                role=m.role,
                created_at=m.created_at,
            )
        )
    return out


@router.post("/invite", response_model=InviteResponse)
async def invite(
    body: InviteBody,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
    _: None = Depends(rate_limit_team_invite),
) -> InviteResponse:
    tok = secrets.token_urlsafe(32)
    expires = datetime.now(UTC) + timedelta(days=7)
    inv = Invitation(
        organization_id=ctx.organization_id,
        email=str(body.email).lower(),
        role=body.role,
        token=tok,
        expires_at=expires,
        invited_by_user_id=user.id,
    )
    db.add(inv)
    await db.flush()
    org = await db.get(Organization, ctx.organization_id)
    accept_url = f"{settings.APP_PUBLIC_URL.rstrip('/')}/invite/accept?token={tok}"
    await send_team_invitation_email(
        to_email=str(body.email),
        organization_name=org.name if org else "Forge",
        accept_url=accept_url,
    )
    await db.commit()
    return InviteResponse(invitation_id=inv.id)


@router.post("/invitations/{token}/accept", response_model=AcceptInviteResponse)
async def accept_invite(
    token: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db_user_only),
) -> AcceptInviteResponse:
    await db.execute(
        text("SELECT set_config('app.invitation_token', :t, true)"),
        {"t": token},
    )
    inv = (
        await db.execute(select(Invitation).where(Invitation.token == token))
    ).scalar_one_or_none()
    if inv is None:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if inv.accepted_at is not None:
        raise HTTPException(status_code=400, detail="Invitation already accepted")
    if inv.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=400, detail="Invitation expired")
    if str(user.email).lower() != str(inv.email).lower():
        raise HTTPException(
            status_code=403,
            detail="Signed-in user does not match invitation email",
        )

    await db.execute(
        text("SELECT set_config('app.current_tenant_id', :o, true)"),
        {"o": str(inv.organization_id)},
    )

    exists = (
        await db.execute(
            select(Membership).where(
                Membership.user_id == user.id,
                Membership.organization_id == inv.organization_id,
            )
        )
    ).scalar_one_or_none()
    if exists:
        inv.accepted_at = datetime.now(UTC)
        await db.commit()
        return AcceptInviteResponse(organization_id=inv.organization_id)

    db.add(
        Membership(
            user_id=user.id,
            organization_id=inv.organization_id,
            role=inv.role,
        )
    )
    inv.accepted_at = datetime.now(UTC)
    await db.commit()
    return AcceptInviteResponse(organization_id=inv.organization_id)


@router.patch("/members/{member_id}", response_model=MemberOut)
async def patch_member(
    member_id: UUID,
    body: PatchMemberBody,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> MemberOut:
    m = await db.get(Membership, member_id)
    if m is None or m.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Member not found")
    u = await db.get(User, m.user_id)
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")

    if m.role == "owner" and body.role != "owner":
        oc = await _owner_count(db, ctx.organization_id)
        if oc <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the last Owner")

    m.role = body.role
    await db.commit()
    await db.refresh(m)
    return MemberOut(
        id=m.id,
        user_id=u.id,
        email=str(u.email),
        display_name=u.display_name,
        role=m.role,
        created_at=m.created_at,
    )


@router.delete("/members/{member_id}")
async def remove_member(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
    user: User = Depends(require_user),
) -> dict[str, bool]:
    m = await db.get(Membership, member_id)
    if m is None or m.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Member not found")
    if m.role == "owner":
        oc = await _owner_count(db, ctx.organization_id)
        if oc <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last Owner")
    if m.user_id == user.id and m.role == "owner":
        oc = await _owner_count(db, ctx.organization_id)
        if oc <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last Owner")
    await db.delete(m)
    await db.commit()
    return {"ok": True}
