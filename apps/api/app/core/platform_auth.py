"""Platform RBAC — permission loading, FastAPI dependencies (GL-02)."""

from __future__ import annotations

import json
import logging
import time
from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy import func, or_, select, text

from app.config import settings
from app.core.errors import ForgeError
from app.db.models import User
from app.db.models.platform_rbac import PlatformPermission, PlatformUserRole
from app.db.session import AsyncSessionLocal
from app.deps.auth import require_user

logger = logging.getLogger(__name__)

# Permissions that require a JWT issued within FRESH_AUTH_MAX_AGE_SECONDS (step-up / re-login).
SENSITIVE_PERMISSIONS: frozenset[str] = frozenset(
    {
        "users:terminate",
        "orgs:delete",
        "billing:issue_refund",
        "impersonate:any_org",
        "users:edit_platform_roles",
        "system:manage_permissions",
    }
)

FRESH_AUTH_MAX_AGE_SECONDS = 15 * 60

_CACHE_TTL = 60
_CACHE_PREFIX = "platform_perms:"


async def _perms_from_db(user_id: UUID) -> tuple[set[str], list[str]]:
    """Return (permission keys, platform role keys)."""
    async with AsyncSessionLocal() as session:
        user = await session.get(User, user_id)
        if user is None:
            return set(), []
        if bool(user.is_admin):
            rows = (await session.execute(select(PlatformPermission.key))).scalars().all()
            return set(rows), ["legacy_is_admin"]

        rkeys = (
            await session.execute(
                select(PlatformUserRole.role_key).where(
                    PlatformUserRole.user_id == user_id,
                    or_(PlatformUserRole.expires_at.is_(None), PlatformUserRole.expires_at > func.now()),
                )
            )
        ).scalars().all()
        role_list = list(rkeys)
        if not role_list:
            return set(), []

        prow = (
            await session.execute(
                text(
                    """
                    SELECT DISTINCT prp.permission_key
                    FROM platform_user_roles pur
                    JOIN platform_role_permissions prp ON prp.role_key = pur.role_key
                    WHERE pur.user_id = CAST(:uid AS uuid)
                      AND (pur.expires_at IS NULL OR pur.expires_at > now())
                    """
                ),
                {"uid": str(user_id)},
            )
        ).scalars().all()
        return set(prow), role_list


async def load_platform_permissions(request: Request, user_id: UUID) -> set[str]:
    """Union of permissions for the user (cached in Redis when available)."""
    redis = getattr(request.app.state, "redis", None)
    cache_key = f"{settings.FORGE_CACHE_NS}:{_CACHE_PREFIX}{user_id}"
    if redis is not None:
        try:
            raw = await redis.get(cache_key)
            if raw:
                data = json.loads(raw)
                if isinstance(data, list):
                    return set(data)
        except Exception as e:
            logger.debug("platform_perm_cache_read: %s", e)

    perms, _roles = await _perms_from_db(user_id)

    if redis is not None and perms:
        try:
            await redis.setex(cache_key, _CACHE_TTL, json.dumps(sorted(perms)))
        except Exception as e:
            logger.debug("platform_perm_cache_write: %s", e)

    return perms


async def require_any_platform_access(
    request: Request,
    user: Annotated[User, Depends(require_user)],
) -> User:
    """At least one platform permission (including legacy ``is_admin`` full catalog)."""
    perms = await load_platform_permissions(request, user.id)
    if not perms:
        raise ForgeError(
            code="insufficient_platform_permission",
            message="No platform access",
            http_status=403,
            extra={},
        )
    return user


async def invalidate_platform_permission_cache(request: Request, user_id: UUID) -> None:
    redis = getattr(request.app.state, "redis", None)
    if redis is None:
        return
    try:
        await redis.delete(f"{settings.FORGE_CACHE_NS}:{_CACHE_PREFIX}{user_id}")
    except Exception as e:
        logger.debug("platform_perm_cache_invalidate: %s", e)


def _jwt_age_seconds(request: Request) -> float | None:
    iat = getattr(request.state, "jwt_iat", None)
    if not isinstance(iat, (int, float)):
        return None
    return max(0.0, time.time() - float(iat))


def require_platform_permission(permission: str) -> Callable:
    """FastAPI dependency: current user must hold ``permission`` (or legacy ``is_admin``)."""

    async def _dep(request: Request, user: Annotated[User, Depends(require_user)]) -> User:
        perms = await load_platform_permissions(request, user.id)
        if permission not in perms:
            raise ForgeError(
                code="insufficient_platform_permission",
                message="Missing platform permission",
                http_status=403,
                extra={"required": permission},
            )
        return user

    return _dep


def require_fresh_platform_auth(permission: str) -> Callable:
    """Like ``require_platform_permission`` but enforces recent primary auth for sensitive perms."""

    async def _dep(request: Request, user: Annotated[User, Depends(require_user)]) -> User:
        perms = await load_platform_permissions(request, user.id)
        if permission not in perms:
            raise ForgeError(
                code="insufficient_platform_permission",
                message="Missing platform permission",
                http_status=403,
                extra={"required": permission},
            )
        if permission in SENSITIVE_PERMISSIONS:
            age = _jwt_age_seconds(request)
            if age is None or age > FRESH_AUTH_MAX_AGE_SECONDS:
                raise ForgeError(
                    code="reauth_required",
                    message="Step-up authentication required",
                    http_status=401,
                    extra={"max_age_seconds": FRESH_AUTH_MAX_AGE_SECONDS},
                )
        return user

    return _dep
