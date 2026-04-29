"""User-facing design memory CRUD (BP-02)."""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import DesignMemory, User
from app.deps import get_db, require_role
from app.deps.auth import require_user
from app.deps.tenant import TenantContext
from app.services.memory.service import (
    delete_design_memory,
    list_design_memory,
    patch_design_memory,
    reset_user_design_memory,
)

router = APIRouter(prefix="/design-memory", tags=["design-memory"])


class DesignMemoryPatchIn(BaseModel):
    value: dict[str, Any] | None = None
    strength: float | None = Field(default=None, ge=0.0, le=1.0)
    scope: Literal["user", "organization"] | None = None


class DesignMemoryResetOut(BaseModel):
    deleted: int


class DesignMemoryRowOut(BaseModel):
    id: UUID
    kind: str
    key: str
    value: dict[str, Any]
    strength: float
    updated_at: str | None

    model_config = {"from_attributes": True}

    @classmethod
    def from_row(cls, r: DesignMemory) -> DesignMemoryRowOut:
        return cls(
            id=r.id,
            kind=r.kind,
            key=r.key,
            value=dict(r.value or {}),
            strength=float(r.strength or 0),
            updated_at=r.updated_at.isoformat() if getattr(r, "updated_at", None) else None,
        )


@router.get("", response_model=list[DesignMemoryRowOut])
async def list_memory_entries(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor", "viewer")),
    user: User = Depends(require_user),
) -> list[DesignMemoryRowOut]:
    rows = await list_design_memory(
        db, organization_id=ctx.organization_id, user_id=user.id, include_org=True
    )
    return [DesignMemoryRowOut.from_row(r) for r in rows]


@router.patch("/{memory_id}", response_model=DesignMemoryRowOut)
async def patch_memory_entry(
    memory_id: UUID,
    body: DesignMemoryPatchIn,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
    user: User = Depends(require_user),
) -> DesignMemoryRowOut:
    scope = None
    if body.scope == "organization":
        scope = "organization"
    elif body.scope == "user":
        scope = "user"
    row = await patch_design_memory(
        db,
        memory_id=memory_id,
        organization_id=ctx.organization_id,
        user_id=user.id,
        value=body.value,
        strength=body.strength,
        scope=scope,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="not_found")
    await db.commit()
    await db.refresh(row)
    return DesignMemoryRowOut.from_row(row)


@router.delete("/{memory_id}")
async def delete_memory_entry(
    memory_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
    user: User = Depends(require_user),
) -> dict[str, str]:
    ok = await delete_design_memory(db, memory_id=memory_id, organization_id=ctx.organization_id, user_id=user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="not_found")
    await db.commit()
    return {"status": "ok"}


@router.post("/reset", response_model=DesignMemoryResetOut)
async def reset_memory_entries(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
    user: User = Depends(require_user),
) -> DesignMemoryResetOut:
    n = await reset_user_design_memory(db, organization_id=ctx.organization_id, user_id=user.id)
    await db.commit()
    return DesignMemoryResetOut(deleted=n)
