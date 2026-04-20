from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from svix.webhooks import Webhook

from app.config import settings
from app.db.models import AuditLog, Membership, Organization, User
from app.deps import get_db, require_user
from app.deps.db import get_db_no_auth
from app.deps.tenant import TenantContext, raw_active_organization_id, require_tenant
from app.schemas.auth import (
    DeleteMeResponse,
    MembershipOut,
    MeResponse,
    SignupBody,
    SignupResponse,
    SwitchOrgBody,
    SwitchOrgResponse,
    UserMePatch,
    UserOut,
)
from app.schemas.user_preferences_full import UserPreferences, UserPreferencesPartial
from app.security.clerk_jwt import verify_clerk_jwt
from app.services.audit_log import write_audit
from app.services.bootstrap import clerk_email_from_payload, ensure_user_org_signup
from app.services.profile_validate import validate_display_name, validate_timezone_iana
from app.services.queue import enqueue_purge_deleted_user
from app.services.settings_cache import cache_delete, cache_get_json, cache_set_json, prefs_key
from app.services.user_prefs_merge import (
    apply_partial_update,
    merged_user_preferences,
    preference_diff,
)

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
        preferences=merged_user_preferences(user.user_preferences).model_dump(mode="json"),
    )


@router.patch("/me", response_model=MeResponse)
async def patch_me(
    body: UserMePatch,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> MeResponse:
    """Update profile fields; timezone/locale merge into `preferences`."""
    uid = getattr(request.state, "user_id", None)
    if uid is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await db.get(User, uid)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if body.display_name is not None:
        validate_display_name(body.display_name)
        user.display_name = body.display_name.strip()
    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url
    prefs = dict(merged_user_preferences(user.user_preferences).model_dump(mode="json"))
    if body.timezone is not None:
        validate_timezone_iana(body.timezone)
        prefs["timezone"] = body.timezone
    if body.locale is not None:
        prefs["locale"] = body.locale
    user.user_preferences = prefs
    await db.commit()
    await db.refresh(user)
    request.state.user = user
    return await me(request, db)


@router.get("/me/preferences", response_model=UserPreferences)
async def get_user_preferences_me(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> UserPreferences:
    """Merged preferences with server defaults (BI-04)."""
    uid = getattr(request.state, "user_id", None)
    if uid is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    row = await db.get(User, uid)
    if row is None:
        raise HTTPException(status_code=404, detail="User not found")
    key = prefs_key(str(row.id))
    cached = await cache_get_json(request, key)
    if cached is not None:
        return UserPreferences.model_validate(cached)
    out = merged_user_preferences(row.user_preferences)
    await cache_set_json(request, key, out.model_dump(mode="json"), ttl_seconds=60)
    return out


@router.patch("/me/preferences")
async def patch_user_preferences(
    body: UserPreferencesPartial,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, bool]:
    """Merge partial preferences; audit + cache invalidation."""
    if body.timezone is not None:
        validate_timezone_iana(body.timezone)
    if body.workspace_timezone is not None:
        validate_timezone_iana(body.workspace_timezone)
    uid = getattr(request.state, "user_id", None)
    if uid is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    row = await db.get(User, uid)
    if row is None:
        raise HTTPException(status_code=401, detail="User not found")
    before = merged_user_preferences(row.user_preferences).model_dump(mode="json")
    after = apply_partial_update(row.user_preferences, body)
    row.user_preferences = after
    dif = preference_diff(before, after)
    if dif:
        await write_audit(
            db,
            organization_id=ctx.organization_id,
            actor_user_id=row.id,
            action="preferences_updated",
            resource_type="user",
            resource_id=row.id,
            changes=dif,
        )
    await db.commit()
    await cache_delete(request, prefs_key(str(row.id)))
    return {"ok": True}


@router.post("/preferences")
async def post_user_preferences(
    body: UserPreferencesPartial,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, bool]:
    """Alias for PATCH /me/preferences."""
    return await patch_user_preferences(body, request, db, ctx)


@router.get("/me/activity")
async def list_my_security_activity(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
) -> dict[str, Any]:
    """Recent audit events where this user was the actor (Settings → Security)."""
    uid = getattr(request.state, "user_id", None)
    if uid is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    q = (
        select(AuditLog)
        .where(AuditLog.actor_user_id == uid)
        .order_by(AuditLog.id.desc())
        .limit(min(limit, 100))
    )
    rows = (await db.execute(q)).scalars().all()
    return {
        "items": [
            {
                "id": r.id,
                "organization_id": str(r.organization_id),
                "action": r.action,
                "resource_type": r.resource_type,
                "resource_id": str(r.resource_id) if r.resource_id else None,
                "changes": r.changes,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ]
    }


@router.delete("/me", response_model=DeleteMeResponse)
async def delete_me(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> DeleteMeResponse:
    """Soft-delete the user; PII scrub is deferred 30 days via background job."""
    uid = getattr(request.state, "user_id", None)
    if uid is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await db.get(User, uid)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if user.deleted_at is not None:
        return DeleteMeResponse(ok=True, purge_job_scheduled=False)
    user.deleted_at = datetime.now(UTC)
    await db.commit()
    await enqueue_purge_deleted_user(request.app.state, str(user.id))
    return DeleteMeResponse(ok=True, purge_job_scheduled=True)


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


@router.post("/signout")
async def signout() -> dict[str, bool]:
    """Client clears Clerk session; this exists for explicit sign-out telemetry hooks."""
    return {"ok": True}


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
                u.deleted_at = datetime.now(UTC)
                await db.commit()

    return {"ok": True}
