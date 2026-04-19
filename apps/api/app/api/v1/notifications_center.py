"""In-app notifications (bell / center) — BI-04."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Notification, User
from app.deps import get_db, require_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


class MarkReadBody(BaseModel):
    ids: list[UUID] | None = None
    all: bool = False


@router.get("")
async def list_notifications(
    unread_only: bool = False,
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
) -> dict[str, Any]:
    q = select(Notification).where(Notification.recipient_user_id == user.id)
    if unread_only:
        q = q.where(Notification.read_at.is_(None))
    q = q.order_by(Notification.created_at.desc()).limit(min(limit, 100))
    rows = (await db.execute(q)).scalars().all()
    return {
        "items": [
            {
                "id": str(r.id),
                "kind": r.kind,
                "title": r.title,
                "body": r.body,
                "action_url": r.action_url,
                "read_at": r.read_at.isoformat() if r.read_at else None,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ]
    }


@router.post("/mark-read")
async def mark_read(
    body: MarkReadBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
) -> dict[str, bool]:
    from datetime import UTC, datetime

    now = datetime.now(UTC)
    if body.all:
        rows = (
            await db.execute(
                select(Notification).where(
                    Notification.recipient_user_id == user.id,
                    Notification.read_at.is_(None),
                )
            )
        ).scalars().all()
        for r in rows:
            r.read_at = now
    elif body.ids:
        for nid in body.ids:
            row = await db.get(Notification, nid)
            if row and row.recipient_user_id == user.id:
                row.read_at = now
    else:
        raise HTTPException(status_code=400, detail="ids or all=true required")
    await db.commit()
    return {"ok": True}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
) -> dict[str, bool]:
    res = await db.execute(
        delete(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_user_id == user.id,
        )
    )
    rowcount = getattr(res, "rowcount", None)
    if rowcount is None or int(rowcount) == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await db.commit()
    return {"ok": True}
