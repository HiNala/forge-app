"""Write tenant-scoped audit rows (BI-04)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLog


async def write_audit(
    db: AsyncSession,
    *,
    organization_id: UUID,
    actor_user_id: UUID | None,
    action: str,
    resource_type: str,
    resource_id: UUID | None = None,
    changes: dict[str, Any] | None = None,
) -> None:
    db.add(
        AuditLog(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            changes=changes,
        )
    )
