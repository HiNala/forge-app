"""Resolve the Forge :class:`~app.db.models.user.User` from Clerk JWT."""

from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, Request
from sqlalchemy import select

from app.config import settings
from app.db.models import User
from app.db.session import AsyncSessionLocal
from app.security.clerk_jwt import verify_clerk_jwt


def _bearer_token(request: Request) -> str | None:
    h = request.headers.get("authorization")
    if not h or not h.lower().startswith("bearer "):
        return None
    parts = h.split()
    return parts[1] if len(parts) == 2 else None


async def require_user(request: Request) -> User:
    """Load user from ``Authorization: Bearer`` Clerk JWT (or test bypass headers)."""
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

    token = _bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = verify_clerk_jwt(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token") from None

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
