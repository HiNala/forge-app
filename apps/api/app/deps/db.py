"""Async SQLAlchemy session with ``SET LOCAL`` RLS session variables."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User
from app.db.session import AsyncSessionLocal
from app.deps.auth import require_user
from app.deps.tenant import TenantContext, optional_tenant


async def get_db(
    request: Request,
    user: User = Depends(require_user),
    _tenant: TenantContext | None = Depends(optional_tenant),
) -> AsyncGenerator[AsyncSession, None]:
    """RLS: ``app.current_user_id`` always; ``app.current_tenant_id`` when org header set."""
    async with AsyncSessionLocal() as session:
        await session.execute(
            text("SELECT set_config('app.current_user_id', :u, true)"),
            {"u": str(user.id)},
        )
        tid = getattr(request.state, "tenant_id", None)
        # RLS casts GUC to uuid — reject non-UUID / empty str (would become ''::uuid).
        if isinstance(tid, UUID):
            await session.execute(
                text("SELECT set_config('app.current_tenant_id', :t, true)"),
                {"t": str(tid)},
            )
        yield session


async def get_db_no_auth() -> AsyncGenerator[AsyncSession, None]:
    """Unauthenticated session (webhooks, public template catalog, OAuth callbacks). No RLS vars."""
    async with AsyncSessionLocal() as session:
        yield session


# Mission 01 naming (public GET /templates, etc.)
get_db_public = get_db_no_auth


async def get_db_user_only(
    user: User = Depends(require_user),
) -> AsyncGenerator[AsyncSession, None]:
    """Authenticated user only (no tenant header) — e.g. invite accept before org membership."""
    async with AsyncSessionLocal() as session:
        await session.execute(
            text("SELECT set_config('app.current_user_id', :u, true)"),
            {"u": str(user.id)},
        )
        yield session
