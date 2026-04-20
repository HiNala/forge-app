"""Backward-compatible exports for intent parsing + assembly (O-02)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.context.models import ContextBundle
from app.services.orchestration.intent import parse_intent
from app.services.orchestration.models import AssemblyPlan, PageIntent
from app.services.orchestration.plan_to_assembly import build_assembly_from_intent

__all__ = ["parse_intent", "compose_assembly_plan", "build_assembly_from_intent"]


async def compose_assembly_plan(
    intent: PageIntent,
    *,
    provider: str | None = None,  # noqa: ARG001 — reserved for future model routing
    db: AsyncSession | None = None,  # noqa: ARG001
    organization_id: UUID | None = None,  # noqa: ARG001
    bundle: ContextBundle | None = None,
) -> AssemblyPlan:
    """Deterministic planner → assembly plan (no compose LLM)."""
    asm, _ = build_assembly_from_intent(intent, bundle)
    return asm
