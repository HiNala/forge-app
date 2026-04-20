"""Resolve the Forge :class:`~app.db.models.user.User` from Clerk JWT or API token."""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, Request
from sqlalchemy import select, text

from app.config import settings
from app.db.models import ApiToken, User
from app.db.session import AsyncSessionLocal
from app.security.clerk_jwt import verify_clerk_jwt

FORGE_LIVE_PREFIX = "forge_live_"


def _bearer_token(request: Request) -> str | None:
    h = request.headers.get("authorization")
    if not h or not h.lower().startswith("bearer "):
        return None
    parts = h.split()
    return parts[1] if len(parts) == 2 else None


def _role_for_scopes(scopes: list[str]) -> str:
    if "admin:all" in scopes:
        return "owner"
    return "editor"


async def _authenticate_api_token(request: Request, bearer: str) -> User:
    if not bearer.startswith(FORGE_LIVE_PREFIX):
        raise HTTPException(status_code=401, detail="Invalid API token")
    digest = hashlib.sha256(bearer.encode()).hexdigest()
    body = bearer[len(FORGE_LIVE_PREFIX) :]
    if len(body) < 8:
        raise HTTPException(status_code=401, detail="Invalid API token")
    prefix = body[:8]

    async with AsyncSessionLocal() as session:
        # RLS: tenant GUC is not set yet; allow SELECT by prefix+hash (see migration n2b3i405).
        await session.execute(
            text("SELECT set_config('app.api_token_lookup_prefix', :p, true)"),
            {"p": prefix},
        )
        await session.execute(
            text("SELECT set_config('app.api_token_lookup_hash', :h, true)"),
            {"h": digest},
        )
        try:
            rows = (
                await session.execute(
                    select(ApiToken).where(
                        ApiToken.prefix == prefix,
                        ApiToken.token_hash == digest,
                        ApiToken.revoked_at.is_(None),
                    )
                )
            ).scalars().all()
        finally:
            await session.execute(
                text("SELECT set_config('app.api_token_lookup_prefix', '', true)")
            )
            await session.execute(
                text("SELECT set_config('app.api_token_lookup_hash', '', true)")
            )
        if not rows:
            raise HTTPException(status_code=401, detail="Invalid API token")
        tok = rows[0]
        if tok.expires_at and datetime.now(UTC) > tok.expires_at.astimezone(UTC):
            raise HTTPException(status_code=401, detail="API token expired")
        user = await session.get(User, tok.created_by)
        if user is None or user.deleted_at is not None:
            raise HTTPException(status_code=401, detail="User not found")

        request.state.user_id = user.id
        request.state.user = user
        request.state.auth_kind = "api_token"
        request.state.api_token = tok
        request.state.tenant_id = tok.organization_id
        request.state.membership_role = _role_for_scopes(list(tok.scopes or []))
        return user


async def require_user(request: Request) -> User:
    """Load user from ``Authorization: Bearer`` (API token, Clerk JWT, or test headers)."""
    token = _bearer_token(request)
    if token and token.startswith(FORGE_LIVE_PREFIX):
        return await _authenticate_api_token(request, token)

    if settings.AUTH_TEST_BYPASS and settings.ENVIRONMENT == "test":
        raw_uid = request.headers.get("x-forge-test-user-id")
        if raw_uid:
            try:
                uid = UUID(raw_uid)
            except ValueError as e:
                raise HTTPException(status_code=400, detail="Invalid test user id") from e
            async with AsyncSessionLocal() as session:
                user = await session.get(User, uid)
                if user is None or user.deleted_at is not None:
                    raise HTTPException(status_code=401, detail="User not found")
                request.state.user_id = user.id
                request.state.user = user
                return user
        raise HTTPException(status_code=401, detail="Missing test user header")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = verify_clerk_jwt(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token") from None

    iat = payload.get("iat")
    if isinstance(iat, (int, float)):
        request.state.jwt_iat = float(iat)

    jti = payload.get("jti")
    if isinstance(jti, str) and jti.strip():
        rc = getattr(request.app.state, "redis", None)
        if rc is not None:
            key = f"{settings.FORGE_CACHE_NS}:jti_revoked:{jti.strip()}"
            try:
                if await rc.get(key):
                    raise HTTPException(
                        status_code=401,
                        detail={"code": "unauthenticated", "message": "Token revoked"},
                    )
            except HTTPException:
                raise
            except Exception:
                pass

    sub = payload.get("sub")
    if not sub or not isinstance(sub, str):
        raise HTTPException(status_code=401, detail="Invalid token payload")

    async with AsyncSessionLocal() as session:
        user = (
            await session.execute(select(User).where(User.auth_provider_id == sub))
        ).scalar_one_or_none()
        if user is None or user.deleted_at is not None:
            raise HTTPException(status_code=401, detail="User not registered")
        request.state.user_id = user.id
        request.state.user = user
        return user
