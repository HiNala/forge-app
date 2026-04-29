"""Explain which design memory influenced a run (BP-02 Layer 4 legibility)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.memory.service import list_design_memory


async def memory_explanation_bullets(
    db: AsyncSession,
    *,
    organization_id: UUID,
    user_id: UUID,
    include_org_wide: bool = True,
    min_strength: float = 0.12,
    apply_memory: bool = True,
) -> list[str]:
    if not apply_memory:
        return []
    rows = await list_design_memory(
        db, organization_id=organization_id, user_id=user_id, include_org=include_org_wide
    )
    out: list[str] = []
    for r in rows:
        strength = float(r.strength or 0)
        if strength < min_strength:
            continue
        label = str(r.kind)
        vk = dict(r.value or {}).get("preference") or str(r.key)
        line = (
            f"Your saved preference (“{vk}”) for {label} "
            f"(strength {strength:.2f})."
        )
        out.append(line)
        if len(out) >= 8:
            break
    return out
