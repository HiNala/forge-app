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
        is_adm = bool(
            getattr(request.state, "is_admin", False) or getattr(user, "is_admin", False)
        )
        await set_is_admin(session, is_adm)
        role = getattr(request.state, "membership_role", None)
        rc = try_get_request_context()
        if rc:
            rc.user_id = user.id
            rc.organization_id = tid if isinstance(tid, UUID) else None
            rc.user_role = role
            rc.is_admin = is_adm
        structlog.contextvars.bind_contextvars(
            user_id=str(user.id),
            organization_id=str(tid) if isinstance(tid, UUID) else None,
        )
        if sentry_sdk is not None:
            try:
                sentry_sdk.set_user(
                    {"id": str(user.id), "email": getattr(user, "email", None) or ""}
                )
                if isinstance(tid, UUID):
                    sentry_sdk.set_tag("organization_id", str(tid))
            except Exception:
                pass
        yield session


get_tenant_db = get_db


async def get_admin_db(
    request: Request,
    user: User = Depends(require_user),
    _tenant: TenantContext | None = Depends(optional_tenant),
) -> AsyncGenerator[AsyncSession, None]:
    """Same RLS session as ``get_db`` with ``app.is_admin`` forced for operator flows.

    A dedicated ``FORGE_ADMIN_DATABASE_URL`` BYPASSRLS pool is optional future work; RLS still
    applies using the active org from ``require_forge_operator`` + ``require_tenant``.
    """
    async with AsyncSessionLocal() as session:
        await set_current_user(session, user.id)
        await set_is_admin(session, True)
        tid = getattr(request.state, "tenant_id", None)
        if isinstance(tid, UUID):
            await set_active_organization(session, tid)
        role = getattr(request.state, "membership_role", None)
        rc = try_get_request_context()
        if rc:
            rc.user_id = user.id
            rc.organization_id = tid if isinstance(tid, UUID) else None
            rc.user_role = role
            rc.is_admin = True
        structlog.contextvars.bind_contextvars(
            user_id=str(user.id),
            organization_id=str(tid) if isinstance(tid, UUID) else None,
        )
        if sentry_sdk is not None:
            try:
                sentry_sdk.set_user(
                    {"id": str(user.id), "email": getattr(user, "email", None) or ""}
                )
                if isinstance(tid, UUID):
                    sentry_sdk.set_tag("organization_id", str(tid))
            except Exception:
                pass
        yield session


async def get_db_no_auth() -> AsyncGenerator[AsyncSession, None]:
    """Unauthenticated session (webhooks, public template catalog, OAuth callbacks). No RLS vars."""
    async with AsyncSessionLocal() as session:
        yield session


# Mission 01 naming (public GET /templates, etc.)
get_db_public = get_db_no_auth

# Alias: public HTML routes set org via slug lookup then ``set_active_organization`` in the handler.
get_public_db = get_db_public


async def get_db_user_only(
    user: User = Depends(require_user),
) -> AsyncGenerator[AsyncSession, None]:
    """Authenticated user only (no tenant header) — e.g. invite accept before org membership."""
    async with AsyncSessionLocal() as session:
        await set_current_user(session, user.id)
        yield session
