from __future__ import annotations

from datetime import UTC
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from svix.webhooks import Webhook

from app.config import settings
from app.db.models import Membership, Organization, User
from app.deps import get_db, require_user
from app.deps.db import get_db_no_auth
from app.deps.tenant import raw_active_organization_id
from app.schemas.auth import (
    MembershipOut,
    MeResponse,
    SignupBody,
    SignupResponse,
    SwitchOrgBody,
    SwitchOrgResponse,
    UserOut,
    UserPreferencesPatch,
)
from app.security.clerk_jwt import verify_clerk_jwt
from app.services.bootstrap import clerk_email_from_payload, ensure_user_org_signup

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_out(u: User) -> UserOut:
    return UserOut(
        id=u.id,
        email=str(u.email),
        display_name=u.display_name,
        avatar_url=u.avatar_url,
    )


@router.post("/signup", response_model=SignupResponse)
async def signup(
    body: SignupBody,
    request: Request,
    db: AsyncSession = Depends(get_db_no_auth),
) -> SignupResponse:
    """Create User + default Organization + Owner membership (requires Clerk JWT)."""
    if settings.AUTH_TEST_BYPASS and settings.ENVIRONMENT == "test":
        raise HTTPException(status_code=400, detail="Use test fixtures instead")
    token = request.headers.get("authorization", "").replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = verify_clerk_jwt(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token") from None

    sub = payload.get("sub")
    if not isinstance(sub, str):
        raise HTTPException(status_code=401, detail="Invalid token")

    email = clerk_email_from_payload(payload)
    name = payload.get("name") or payload.get("given_name")
    avatar = payload.get("picture") or payload.get("image_url")

    user, org = await ensure_user_org_signup(
        db,
        auth_provider_id=sub,
        email=email,
        display_name=name if isinstance(name, str) else None,
        avatar_url=avatar if isinstance(avatar, str) else None,
        workspace_name=body.workspace_name,
    )
    await db.commit()
    return SignupResponse(user_id=user.id, organization_id=org.id)


@router.get("/me", response_model=MeResponse)
async def me(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> MeResponse:
    user: User = request.state.user
    raw_org = raw_active_organization_id(request)
    active_org: UUID | None = None
    active_role: str | None = None
    if raw_org:
        try:
            active_org = UUID(raw_org)
        except ValueError:
            active_org = None

    m_rows = (
        await db.execute(
            select(Membership, Organization)
            .join(Organization, Organization.id == Membership.organization_id)
            .where(Membership.user_id == user.id, Organization.deleted_at.is_(None))
        )
    ).all()

    memberships: list[MembershipOut] = []
    for m, o in m_rows:
        memberships.append(
            MembershipOut(
                organization_id=o.id,
                organization_name=o.name,
                organization_slug=o.slug,
                role=m.role,
            )
        )
        if active_org and o.id == active_org:
            active_role = m.role

    return MeResponse(
        user=_user_out(user),
        memberships=memberships,
        active_organization_id=active_org if raw_org else None,
        active_role=active_role,
        preferences=user.preferences,
    )


@router.patch("/me/preferences")
async def patch_user_preferences(
    body: UserPreferencesPatch,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    """Persist UI preferences (e.g. sidebar collapsed) for cross-device sync."""
    prefs = dict(user.preferences or {})
    if body.sidebar_collapsed is not None:
        prefs["sidebar_collapsed"] = body.sidebar_collapsed
    user.preferences = prefs
    await db.commit()
    return {"ok": True}


@router.post("/switch-org", response_model=SwitchOrgResponse)
async def switch_org(
    body: SwitchOrgBody,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> SwitchOrgResponse:
    m = (
        await db.execute(
            select(Membership).where(
                Membership.user_id == user.id,
                Membership.organization_id == body.organization_id,
            )
        )
    ).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=403, detail="Not a member of this organization")
    org = await db.get(Organization, body.organization_id)
    if org is None or org.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return SwitchOrgResponse(active_organization_id=body.organization_id)


@router.post("/webhook")
async def auth_webhook(
    request: Request, db: AsyncSession = Depends(get_db_no_auth)
) -> dict[str, bool]:
    if not settings.CLERK_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured")
    payload = await request.body()
    headers = {k: v for k, v in request.headers.items()}
    try:
        wh = Webhook(settings.CLERK_WEBHOOK_SECRET)
        data: dict[str, Any] = wh.verify(payload, headers)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid webhook signature") from None

    etype = data.get("type")
    if etype == "user.created":
        d = data.get("data", {})
        aid = d.get("id")
        em = None
        if "email_addresses" in d and d["email_addresses"]:
            em = d["email_addresses"][0].get("email_address")
        if aid and em:
            exists = (
                await db.execute(select(User).where(User.auth_provider_id == aid))
            ).scalar_one_or_none()
            if exists is None:
                db.add(
                    User(
                        email=em,
                        display_name=d.get("first_name"),
                        auth_provider_id=aid,
                    )
                )
                await db.commit()
    elif etype == "user.updated":
        d = data.get("data", {})
        aid = d.get("id")
        if aid:
            u = (
                await db.execute(select(User).where(User.auth_provider_id == aid))
            ).scalar_one_or_none()
            if u:
                if "email_addresses" in d and d["email_addresses"]:
                    u.email = d["email_addresses"][0].get("email_address") or u.email
                u.display_name = d.get("first_name") or u.display_name
                await db.commit()
    elif etype == "user.deleted":
        d = data.get("data", {})
        aid = d.get("id")
        if aid:
            u = (
                await db.execute(select(User).where(User.auth_provider_id == aid))
            ).scalar_one_or_none()
            if u:
                from datetime import datetime

                u.deleted_at = datetime.now(UTC)
                await db.commit()

    return {"ok": True}
