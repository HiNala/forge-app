"""Design memory read/write helpers (BP-02)."""

from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.design_memory import DesignMemory


def _clamp_strength(value: Decimal | float | int) -> Decimal:
    v = Decimal(str(value))
    if v < Decimal("0"):
        return Decimal("0")
    if v > Decimal("1"):
        return Decimal("1")
    return v


async def list_design_memory(
    db: AsyncSession,
    *,
    organization_id: UUID,
    user_id: UUID,
    include_org: bool = True,
) -> list[DesignMemory]:
    clauses = [DesignMemory.organization_id == organization_id]
    if include_org:
        clauses.append((DesignMemory.user_id == user_id) | DesignMemory.user_id.is_(None))
    else:
        clauses.append(DesignMemory.user_id == user_id)
    rows = (
        await db.execute(
            select(DesignMemory)
            .where(*clauses)
            .order_by(DesignMemory.kind.asc(), DesignMemory.key.asc(), DesignMemory.updated_at.desc())
        )
    ).scalars().all()
    return list(rows)


async def upsert_design_memory(
    db: AsyncSession,
    *,
    organization_id: UUID,
    user_id: UUID | None,
    kind: str,
    key: str,
    value: dict[str, Any],
    strength_delta: float,
    source: dict[str, Any] | None = None,
) -> DesignMemory:
    row = (
        await db.execute(
            select(DesignMemory).where(
                DesignMemory.organization_id == organization_id,
                DesignMemory.user_id.is_(None) if user_id is None else DesignMemory.user_id == user_id,
                DesignMemory.kind == kind,
                DesignMemory.key == key,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        row = DesignMemory(
            organization_id=organization_id,
            user_id=user_id,
            kind=kind[:120],
            key=key[:200],
            value=value,
            strength=_clamp_strength(Decimal("0.3") + Decimal(str(strength_delta))),
            sources=[source] if source else [],
        )
        db.add(row)
        await db.flush()
        return row
    row.value = value
    row.strength = _clamp_strength(Decimal(str(row.strength)) + Decimal(str(strength_delta)))
    srcs = list(row.sources or [])
    if source:
        srcs.append(source)
    row.sources = srcs[-25:]
    db.add(row)
    await db.flush()
    return row


async def patch_design_memory(
    db: AsyncSession,
    *,
    memory_id: UUID,
    organization_id: UUID,
    user_id: UUID,
    value: dict[str, Any] | None = None,
    strength: float | None = None,
    scope: str | None = None,
) -> DesignMemory | None:
    row = await db.get(DesignMemory, memory_id)
    if row is None or row.organization_id != organization_id:
        return None
    if row.user_id not in (user_id, None):
        return None
    if value is not None:
        row.value = value
    if strength is not None:
        row.strength = _clamp_strength(strength)
    if scope == "organization":
        row.user_id = None
    elif scope == "user":
        row.user_id = user_id
    db.add(row)
    await db.flush()
    return row


async def delete_design_memory(
    db: AsyncSession, *, memory_id: UUID, organization_id: UUID, user_id: UUID) -> bool:
    row = await db.get(DesignMemory, memory_id)
    if row is None or row.organization_id != organization_id:
        return False
    if row.user_id not in (user_id, None):
        return False
    await db.delete(row)
    await db.flush()
    return True


async def reset_user_design_memory(db: AsyncSession, *, organization_id: UUID, user_id: UUID) -> int:
    res = await db.execute(
        delete(DesignMemory).where(
            DesignMemory.organization_id == organization_id,
            DesignMemory.user_id == user_id,
        )
    )
    rc = getattr(res, "rowcount", None)
    return int(rc or 0)
