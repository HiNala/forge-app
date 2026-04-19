"""Google Calendar OAuth + connections (Mission 05)."""

from __future__ import annotations

import json
import logging
import secrets
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import CalendarConnection, User
from app.deps import get_db, require_tenant
from app.deps.auth import require_user
from app.deps.db import get_db_no_auth
from app.deps.redis_client import require_redis
from app.deps.tenant import TenantContext
from app.schemas.automation import CalendarConnectionOut, GoogleConnectBody
from app.services.calendar import CALENDAR_SCOPE
from app.services.token_crypto import encrypt_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calendar", tags=["calendar"])

_STATE_PREFIX = "cal:oauth:"


def _client_config() -> dict:
    uri = f"{settings.API_BASE_URL.rstrip('/')}/api/v1/calendar/callback/google"
    return {
        "web": {
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [uri],
        }
    }


def _flow() -> Flow:
    return Flow.from_client_config(
        _client_config(),
        scopes=[CALENDAR_SCOPE],
        redirect_uri=f"{settings.API_BASE_URL.rstrip('/')}/api/v1/calendar/callback/google",
    )


@router.post("/connect/google")
async def connect_google(
    body: GoogleConnectBody | None = None,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    user: User = Depends(require_user),
    redis=Depends(require_redis),
) -> dict[str, str]:
    if not settings.GOOGLE_OAUTH_CLIENT_ID or not settings.GOOGLE_OAUTH_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")
    state = secrets.token_urlsafe(32)
    payload = {
        "user_id": str(user.id),
        "org_id": str(ctx.organization_id),
        "page_id": str(body.page_id) if body and body.page_id else None,
    }
    await redis.setex(_STATE_PREFIX + state, 300, json.dumps(payload))

    flow = _flow()
    url, _st = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        state=state,
        include_granted_scopes="true",
    )
    return {"authorize_url": url, "state": state}


@router.get("/callback/google")
async def callback_google(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db_no_auth),
    redis=Depends(require_redis),
) -> RedirectResponse:
    if error:
        logger.warning("google oauth error=%s", error)
        return RedirectResponse(
            url=f"{settings.APP_PUBLIC_URL.rstrip('/')}/settings?calendar_error=1",
            status_code=302,
        )
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")

    raw = await redis.get(_STATE_PREFIX + state)
    if not raw:
        raise HTTPException(status_code=400, detail="Invalid or expired state")
    await redis.delete(_STATE_PREFIX + state)
    meta = json.loads(raw)
    user_id = UUID(meta["user_id"])
    org_id = UUID(meta["org_id"])
    page_id = meta.get("page_id")

    await db.execute(
        text("SELECT set_config('app.current_user_id', :u, true)"),
        {"u": str(user_id)},
    )
    await db.execute(
        text("SELECT set_config('app.current_tenant_id', :t, true)"),
        {"t": str(org_id)},
    )

    flow = _flow()
    try:
        flow.fetch_token(authorization_response=str(request.url))
    except Exception as e:
        logger.exception("google token exchange %s", e)
        raise HTTPException(status_code=400, detail="Token exchange failed") from e

    creds = flow.credentials
    if not creds.token:
        raise HTTPException(status_code=400, detail="No access token")

    token_expires_at: datetime | None = None
    if creds.expiry:
        expiry = creds.expiry
        token_expires_at = (
            expiry.replace(tzinfo=UTC) if expiry.tzinfo is None else expiry.astimezone(UTC)
        )

    conn = CalendarConnection(
        user_id=user_id,
        organization_id=org_id,
        provider="google",
        calendar_id="primary",
        calendar_name="Primary",
        access_token_encrypted=encrypt_text(creds.token),
        refresh_token_encrypted=encrypt_text(creds.refresh_token)
        if creds.refresh_token
        else None,
        token_expires_at=token_expires_at,
        scopes=list(creds.scopes or [CALENDAR_SCOPE]),
    )
    db.add(conn)
    await db.commit()

    dest = f"{settings.APP_PUBLIC_URL.rstrip('/')}/pages"
    if page_id:
        dest = f"{settings.APP_PUBLIC_URL.rstrip('/')}/pages/{page_id}/automations?connected=1"
    else:
        dest = f"{settings.APP_PUBLIC_URL.rstrip('/')}/settings?calendar_connected=1"
    return RedirectResponse(url=dest, status_code=302)


@router.post("/connect/apple")
async def connect_apple() -> None:
    raise HTTPException(
        status_code=501,
        detail="Apple Calendar connection is not implemented yet. Use Google Calendar for now.",
    )


@router.delete("/connections/{connection_id}")
async def delete_connection(
    connection_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, bool]:
    row = await db.get(CalendarConnection, connection_id)
    if row is None or row.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(row)
    await db.commit()
    return {"ok": True}


@router.get("/connections", response_model=list[CalendarConnectionOut])
async def list_connections(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> list[CalendarConnection]:
    rows = (
        await db.execute(
            select(CalendarConnection).where(
                CalendarConnection.organization_id == ctx.organization_id
            )
        )
    ).scalars().all()
    return list(rows)
