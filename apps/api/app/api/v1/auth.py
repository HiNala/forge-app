from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any, cast
from urllib.parse import urlencode
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import AuditLog, Membership, OAuthIdentity, Organization, User
from app.deps import get_db, require_user
from app.deps.db import get_db_no_auth
from app.deps.tenant import TenantContext, raw_active_organization_id, require_tenant
from app.schemas.auth import (
    AuthTokenResponse,
    DeleteMeResponse,
    LoginBody,
    LogoutBody,
    MembershipOut,
    MeResponse,
    RefreshBody,
    RegisterBody,
    ResendVerificationResponse,
    SignupBody,
    SignupResponse,
    SwitchOrgBody,
    SwitchOrgResponse,
    UserMePatch,
    UserOut,
    VerifyEmailBody,
    VerifyEmailResponse,
)
from app.schemas.user_preferences_full import UserPreferences, UserPreferencesPartial
from app.security.passwords import hash_password, verify_password
from app.services.audit_log import write_audit
from app.services.auth.sessions import issue_token_pair, revoke_refresh_token, rotate_refresh_token
from app.services.bootstrap import ensure_user_org_signup
from app.services.email import email_service
from app.services.profile_validate import validate_display_name, validate_timezone_iana
from app.services.queue import enqueue_purge_deleted_user
from app.services.settings_cache import cache_delete, cache_get_json, cache_set_json, prefs_key
from app.services.user_prefs_merge import (
    apply_partial_update,
    merged_user_preferences,
    preference_diff,
)

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

_GOOGLE_AUTH_SCOPE = "openid email profile"
_GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo"


def _user_out(u: User) -> UserOut:
    return UserOut(
        id=u.id,
        email=str(u.email),
        display_name=u.display_name,
        avatar_url=u.avatar_url,
        email_verified=u.email_verified_at is not None,
        is_platform_admin=bool(getattr(u, "is_admin", False)),
    )


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _auth_response(user: User, pair: dict[str, object], organization_id: UUID | None = None) -> AuthTokenResponse:
    return AuthTokenResponse(
        access_token=str(pair["access_token"]),
        token_type=str(pair["token_type"]),
        expires_in=int(cast(Any, pair["expires_in"])),
        refresh_token=str(pair["refresh_token"]),
        user=_user_out(user),
        organization_id=organization_id,
    )


def _signed_state(next_path: str | None = None) -> str:
    payload = {
        "nonce": secrets.token_urlsafe(24),
        "iat": int(datetime.now(UTC).timestamp()),
        "next": next_path or "/dashboard",
    }
    body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    sig = hmac.new(settings.auth_jwt_secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return f"{body}.{sig}"


def _verify_state(state: str) -> dict[str, Any]:
    try:
        body, sig = state.split(".", 1)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid OAuth state") from e
    expected = hmac.new(settings.auth_jwt_secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    padded = body + "=" * (-len(body) % 4)
    data = json.loads(base64.urlsafe_b64decode(padded.encode()))
    if int(datetime.now(UTC).timestamp()) - int(data.get("iat", 0)) > 600:
        raise HTTPException(status_code=400, detail="OAuth state expired")
    return cast(dict[str, Any], data)


def _google_redirect_uri() -> str:
    return f"{settings.API_BASE_URL.rstrip('/')}/api/v1/auth/oauth/google/callback"


def _hash_email_verification_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _new_email_verification_token(user: User) -> str:
    token = secrets.token_urlsafe(48)
    now = datetime.now(UTC)
    user.email_verification_token_hash = _hash_email_verification_token(token)
    user.email_verification_sent_at = now
    user.email_verification_expires_at = now + timedelta(hours=24)
    return token


async def _send_email_verification(user: User, token: str) -> bool:
    verify_url = f"{settings.APP_PUBLIC_URL.rstrip('/')}/verify-email?token={token}"
    try:
        await email_service.send_email_verification(
            to_email=str(user.email),
            display_name=user.display_name,
            verify_url=verify_url,
        )
    except Exception as e:
        logger.warning("email_verification_send_failed user_id=%s error=%s", user.id, e)
        return False
    return True


@router.post("/register", response_model=AuthTokenResponse)
async def register(
    body: RegisterBody,
    request: Request,
    db: AsyncSession = Depends(get_db_no_auth),
) -> AuthTokenResponse:
    email = _normalize_email(body.email)
    if len(body.password) < settings.AUTH_PASSWORD_MIN_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"Password must be at least {settings.AUTH_PASSWORD_MIN_LENGTH} characters",
        )
    existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        email=email,
        display_name=body.display_name,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.flush()
    user.auth_provider_id = f"forge:{user.id}"
    user, org = await ensure_user_org_signup(
        db,
        auth_provider_id=user.auth_provider_id,
        email=email,
        display_name=body.display_name,
        avatar_url=None,
        workspace_name=body.workspace_name,
    )
    pair = await issue_token_pair(db, request, user)
    token = _new_email_verification_token(user)
    await _send_email_verification(user, token)
    await db.commit()
    return _auth_response(user, pair, org.id)


@router.post("/email/verify", response_model=VerifyEmailResponse)
async def verify_email(
    body: VerifyEmailBody,
    db: AsyncSession = Depends(get_db_no_auth),
) -> VerifyEmailResponse:
    token_hash = _hash_email_verification_token(body.token)
    user = (
        await db.execute(select(User).where(User.email_verification_token_hash == token_hash))
    ).scalar_one_or_none()
    if user is None or user.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    exp = user.email_verification_expires_at
    if exp is None:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    exp = exp.replace(tzinfo=UTC) if exp.tzinfo is None else exp.astimezone(UTC)
    if datetime.now(UTC) > exp:
        raise HTTPException(status_code=410, detail="Verification token expired")
    user.email_verified_at = datetime.now(UTC)
    user.email_verification_token_hash = None
    user.email_verification_expires_at = None
    await db.commit()
    return VerifyEmailResponse(user_id=user.id)


@router.post("/email/verification/resend", response_model=ResendVerificationResponse)
async def resend_email_verification(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> ResendVerificationResponse:
    user: User = request.state.user
    if user.email_verified_at is not None:
        return ResendVerificationResponse(sent=False, already_verified=True)
    sent_at = user.email_verification_sent_at
    if sent_at is not None:
        sent_at = sent_at.replace(tzinfo=UTC) if sent_at.tzinfo is None else sent_at.astimezone(UTC)
        if datetime.now(UTC) - sent_at < timedelta(seconds=60):
            raise HTTPException(status_code=429, detail="Verification email was just sent")
    token = _new_email_verification_token(user)
    sent = await _send_email_verification(user, token)
    await db.commit()
    return ResendVerificationResponse(sent=sent)


@router.post("/login", response_model=AuthTokenResponse)
async def login(
    body: LoginBody,
    request: Request,
    db: AsyncSession = Depends(get_db_no_auth),
) -> AuthTokenResponse:
    email = _normalize_email(body.email)
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user is None or user.deleted_at is not None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    pair = await issue_token_pair(db, request, user)
    await db.commit()
    return _auth_response(user, pair)


@router.post("/refresh", response_model=AuthTokenResponse)
async def refresh(
    body: RefreshBody,
    request: Request,
    db: AsyncSession = Depends(get_db_no_auth),
) -> AuthTokenResponse:
    user, pair = await rotate_refresh_token(db, request, body.refresh_token)
    await db.commit()
    return _auth_response(user, pair)


@router.post("/logout")
async def logout(
    body: LogoutBody | None = None,
    db: AsyncSession = Depends(get_db_no_auth),
) -> dict[str, bool]:
    if body and body.refresh_token:
        await revoke_refresh_token(db, body.refresh_token)
        await db.commit()
    return {"ok": True}


@router.get("/oauth/google")
async def google_oauth_start(next: str | None = None) -> dict[str, str]:  # noqa: A002 - API query name
    if not settings.google_auth_client_id:
        raise HTTPException(status_code=503, detail="Google login is not configured")
    params = {
        "client_id": settings.google_auth_client_id,
        "redirect_uri": _google_redirect_uri(),
        "response_type": "code",
        "scope": _GOOGLE_AUTH_SCOPE,
        "access_type": "online",
        "include_granted_scopes": "true",
        "state": _signed_state(next),
        "prompt": "select_account",
    }
    return {"authorize_url": f"{_GOOGLE_AUTH_ENDPOINT}?{urlencode(params)}"}


@router.get("/oauth/google/callback")
async def google_oauth_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db_no_auth),
) -> RedirectResponse:
    app_url = settings.APP_PUBLIC_URL.rstrip("/")
    if error:
        return RedirectResponse(f"{app_url}/signin?error=google_oauth")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing OAuth code or state")
    state_data = _verify_state(state)
    if not settings.google_auth_client_id or not settings.google_auth_client_secret:
        raise HTTPException(status_code=503, detail="Google login is not configured")
    async with httpx.AsyncClient(timeout=15) as client:
        token_resp = await client.post(
            _GOOGLE_TOKEN_ENDPOINT,
            data={
                "client_id": settings.google_auth_client_id,
                "client_secret": settings.google_auth_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": _google_redirect_uri(),
            },
        )
        if token_resp.status_code >= 400:
            raise HTTPException(status_code=401, detail="Google token exchange failed")
        access_token = token_resp.json().get("access_token")
        if not isinstance(access_token, str):
            raise HTTPException(status_code=401, detail="Google token response missing access token")
        userinfo_resp = await client.get(_GOOGLE_USERINFO_ENDPOINT, headers={"Authorization": f"Bearer {access_token}"})
        if userinfo_resp.status_code >= 400:
            raise HTTPException(status_code=401, detail="Google profile fetch failed")
    profile = userinfo_resp.json()
    sub = profile.get("sub")
    email = profile.get("email")
    if not isinstance(sub, str) or not isinstance(email, str):
        raise HTTPException(status_code=401, detail="Google profile missing identity")
    email = _normalize_email(email)
    google_email_verified = bool(profile.get("email_verified"))
    identity = (
        await db.execute(
            select(OAuthIdentity).where(
                OAuthIdentity.provider == "google",
                OAuthIdentity.provider_subject == sub,
            )
        )
    ).scalar_one_or_none()
    if identity is not None:
        user = await db.get(User, identity.user_id)
        if user is None or user.deleted_at is not None:
            raise HTTPException(status_code=401, detail="Linked user not found")
    else:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if user is None:
            user = User(
                email=email,
                display_name=profile.get("name") if isinstance(profile.get("name"), str) else None,
                avatar_url=profile.get("picture") if isinstance(profile.get("picture"), str) else None,
                email_verified_at=datetime.now(UTC) if google_email_verified else None,
            )
            db.add(user)
            await db.flush()
            user.auth_provider_id = f"forge:{user.id}"
            await ensure_user_org_signup(
                db,
                auth_provider_id=user.auth_provider_id,
                email=email,
                display_name=user.display_name,
                avatar_url=user.avatar_url,
                workspace_name=f"{email.split('@')[0]} workspace",
            )
        db.add(
            OAuthIdentity(
                user_id=user.id,
                provider="google",
                provider_subject=sub,
                email=email,
                profile=profile,
            )
        )
    if google_email_verified and user.email_verified_at is None:
        user.email_verified_at = datetime.now(UTC)
        user.email_verification_token_hash = None
        user.email_verification_expires_at = None
    pair = await issue_token_pair(db, request, user)
    await db.commit()
    next_path = str(state_data.get("next") or "/dashboard")
    fragment = urlencode(
        {
            "access_token": pair["access_token"],
            "refresh_token": pair["refresh_token"],
            "next": next_path,
        }
    )
    return RedirectResponse(f"{app_url}/auth/callback#{fragment}")


@router.post("/signup", response_model=SignupResponse)
async def signup(
    body: SignupBody,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> SignupResponse:
    """Create the user's default Organization + Owner membership if missing."""
    provider_id = user.auth_provider_id or f"forge:{user.id}"
    user.auth_provider_id = provider_id
    user, org = await ensure_user_org_signup(
        db,
        auth_provider_id=provider_id,
        email=str(user.email),
        display_name=user.display_name,
        avatar_url=user.avatar_url,
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
async def signout(
    body: LogoutBody | None = None,
    db: AsyncSession = Depends(get_db_no_auth),
) -> dict[str, bool]:
    """Compatibility alias for first-party logout."""
    return await logout(body, db)


@router.post("/webhook")
async def auth_webhook(
    request: Request, db: AsyncSession = Depends(get_db_no_auth)
) -> dict[str, bool]:
    raise HTTPException(status_code=410, detail="Clerk webhooks have been removed")
