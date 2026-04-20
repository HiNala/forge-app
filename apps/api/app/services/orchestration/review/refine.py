"""Re-render refined component tree to HTML (O-04 refine loop).

LLM-driven patch application is future work; today we re-render the tree so validation
still receives coherent HTML after the refine step.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from app.services.orchestration.review.models import Finding
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.orchestration.component_lib.render import render_full_document
from app.services.orchestration.component_lib.schema import ComponentTree
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan


async def refine_component_tree_from_findings(
    *,
    tree: Any,
    fixables: list[Finding],
    plan: PagePlan,
    intent: PageIntent,
    user_prompt: str,
    provider: str | None,
    db: AsyncSession,
    organization_id: UUID,
    form_action: str | None,
) -> tuple[Any, str]:
    del fixables, intent, user_prompt, provider, db, organization_id
    brand = plan.brand_tokens
    fa = form_action or ""
    html = (
        render_full_document(tree, brand, form_action=fa)
        if isinstance(tree, ComponentTree)
        else ""
    )
    return tree, html
