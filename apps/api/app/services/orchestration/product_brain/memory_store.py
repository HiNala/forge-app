"""Persist BP-01 memory writes to ``design_memory``."""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.design_memory import DesignMemory
from app.services.orchestration.product_brain.schemas import MemoryWrite

logger = logging.getLogger(__name__)


async def persist_memory_writes(
    db: AsyncSession,
    *,
    organization_id: UUID,
    user_id: UUID,
    writes: list[Any],
    run_id: str,
) -> None:
    """Upsert structured preference rows (strength starts at 0.30; reinforce on repeat)."""
    oid, uid = organization_id, user_id
    for raw in writes:
        if not isinstance(raw, MemoryWrite):
            continue
        w = raw
        stmt = select(DesignMemory).where(
            DesignMemory.organization_id == oid,
            DesignMemory.user_id == uid,
            DesignMemory.kind == w.kind,
            DesignMemory.key == w.key,
        )
        row = (await db.execute(stmt)).scalar_one_or_none()
        if row is None:
            db.add(
                DesignMemory(
                    organization_id=oid,
                    user_id=uid,
                    kind=w.kind,
                    key=w.key,
                    value=dict(w.value),
                    strength=Decimal("0.30"),
                    sources=[{"run_id": run_id}],
                )
            )
            continue
        row.value = dict(w.value)
        row.strength = min(Decimal("1.0"), (row.strength or Decimal("0.3")) + Decimal("0.05"))
        src = list(row.sources or [])
        src.append({"run_id": run_id})
        row.sources = src
    try:
        await db.flush()
    except Exception as e:
        logger.warning("design_memory_flush_skip %s", e)
        await db.rollback()
