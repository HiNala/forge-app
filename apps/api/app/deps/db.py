"""Async SQLAlchemy session with transaction-scoped RLS GUCs (BI-02)."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from uuid import UUID

import structlog
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

try:
    import sentry_sdk
except ImportError:  # pragma: no cover
    sentry_sdk = None  # type: ignore[assignment]

from app.core.context import try_get_request_context
from app.db.models import User
from app.db.rls_context import set_active_organization, set_current_user, set_is_admin
from app.db.session import AsyncSessionLocal
from app.deps.auth import require_user
from app.deps.tenant import TenantContext, optional_tenant


async def get_db(
    request: Request,
    user: User = Depends(require_user),
    _tenant: TenantContext | None = Depends(optional_tenant),
) -> AsyncGenerator[AsyncSession, None]:
    """RLS GUCs on the session transaction; mirrors :class:`RequestContext` for logs."""
    async with AsyncSessionLocal() as session:
        await set_current_user(session, user.id)
        tid = getattr(request.state, "tenant_id", None)
        if isinstance(tid, UUID):
            await set_active_organization(session, tid)
        await set_is_admin(session, getattr(request.state, "is_admin", False))
        role = getattr(request.state, "membership_role", None)
        rc = try_get_request_context()
        if rc:
            rc.user_id = user.id
            rc.organization_id = tid if isinstance(tid, UUID) else None
            rc.user_role = role
            rc.is_admin = bool(getattr(request.state, "is_admin", False))
        structlog.contextvars.bind_contextvars(
            user_id=str(user.id),
            organization_id=str(tid) if isinstance(tid, UUID) else None,
        )
        if sentry_sdk is not None:
            try:
                sentry_sdk.set_user({"id": str(user.id), "email": getattr(user, "email", None)})
                if isinstance(tid, UUID):
                    sentry_sdk.set_tag("organization_id", str(tid))
            except Exception:
                pass
        yield session


get_tenant_db = get_db


async def get_admin_db() -> AsyncGenerator[AsyncSession, None]:
    """Reserved for a ``forge_admin`` connection (BYPASSRLS). Operator tools use ``get_db`` + allowlist today."""
    from app.core.errors import NotAuthorized

    raise NotAuthorized(
        "Dedicated admin DB pool is not configured; use FORGE_OPERATOR_ORG_IDS with get_db.",
    )
    yield  # pragma: no cover — dependency must be an async generator


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
        await set_current_user(session, user.id)
        yield session
