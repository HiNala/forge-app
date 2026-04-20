"""Legacy helper: ``users.is_admin`` (BI-04). Prefer :mod:`app.core.platform_auth` (GL-02)."""

from __future__ import annotations

from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User
from app.deps.auth import require_user
from app.deps.db import get_db_user_only


async def require_platform_admin(
    request: Request,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db_user_only),
) -> User:
    row = await db.get(User, user.id)
    if row is None or not bool(row.is_admin):
        raise HTTPException(status_code=403, detail="Not a platform administrator")
    request.state.is_admin = True
    return user
