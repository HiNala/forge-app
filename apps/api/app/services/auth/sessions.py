"""Refresh-token session issuance and rotation."""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import AuthSession, User
from app.security.session_jwt import create_access_token


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_refresh_token() -> str:
    return secrets.token_urlsafe(64)


def _request_ip(request: Request) -> str | None:
    if request.client is None:
        return None
    return request.client.host


async def issue_token_pair(
    db: AsyncSession,
    request: Request,
    user: User,
    *,
    rotated_from_hash: str | None = None,
) -> dict[str, object]:
    access_token, _, access_expires_at = create_access_token(
        user_id=user.id, is_admin=bool(getattr(user, "is_admin", False))
    )
    refresh_token = new_refresh_token()
    expires_at = datetime.now(UTC) + timedelta(seconds=settings.AUTH_REFRESH_TOKEN_TTL_SECONDS)
    db.add(
        AuthSession(
            user_id=user.id,
            refresh_token_hash=hash_refresh_token(refresh_token),
            rotated_from_hash=rotated_from_hash,
            user_agent=request.headers.get("user-agent"),
            ip_address=_request_ip(request),
            expires_at=expires_at,
        )
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.AUTH_ACCESS_TOKEN_TTL_SECONDS,
        "expires_at": access_expires_at,
        "refresh_token": refresh_token,
        "refresh_expires_at": expires_at,
    }


async def rotate_refresh_token(
    db: AsyncSession,
    request: Request,
    refresh_token: str,
) -> tuple[User, dict[str, object]]:
    now = datetime.now(UTC)
    token_hash = hash_refresh_token(refresh_token)
    session = (
        await db.execute(select(AuthSession).where(AuthSession.refresh_token_hash == token_hash))
    ).scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if session.revoked_at is not None:
        await _revoke_user_sessions(db, session.user_id)
        raise HTTPException(status_code=401, detail="Refresh token reused")
    if session.expires_at.astimezone(UTC) <= now:
        session.revoked_at = now
        raise HTTPException(status_code=401, detail="Refresh token expired")
    user = await db.get(User, session.user_id)
    if user is None or user.deleted_at is not None:
        session.revoked_at = now
        raise HTTPException(status_code=401, detail="User not found")
    session.revoked_at = now
    session.last_used_at = now
    pair = await issue_token_pair(db, request, user, rotated_from_hash=token_hash)
    return user, pair


async def revoke_refresh_token(db: AsyncSession, refresh_token: str) -> None:
    token_hash = hash_refresh_token(refresh_token)
    session = (
        await db.execute(select(AuthSession).where(AuthSession.refresh_token_hash == token_hash))
    ).scalar_one_or_none()
    if session is not None and session.revoked_at is None:
        session.revoked_at = datetime.now(UTC)


async def _revoke_user_sessions(db: AsyncSession, user_id: object) -> None:
    now = datetime.now(UTC)
    sessions = (
        await db.execute(
            select(AuthSession).where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
        )
    ).scalars().all()
    for session in sessions:
        session.revoked_at = now
