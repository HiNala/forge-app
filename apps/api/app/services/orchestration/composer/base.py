"""Shared composer scaffolding — Mission O-03."""

from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.context.models import ContextBundle
from app.services.llm.composer_prompts import load_composer_prompt
from app.services.llm.llm_router import structured_completion
from app.services.orchestration.component_lib.catalog import catalog_markdown_summary
from app.services.orchestration.component_lib.render import extract_form_schema_hints, render_full_document
from app.services.orchestration.component_lib.schema import ComponentTree, ProposalComponentTree
from app.services.orchestration.composer.composed_page import ComposedPage
from app.services.orchestration.composer.proposal_math import validate_proposal_tree
from app.services.orchestration.composer.safety import sanitize_component_tree
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import BrandTokens, PagePlan

logger = logging.getLogger(__name__)


def _voice_block(plan: PagePlan, bundle: ContextBundle | None) -> str:
    v = plan.voice_profile
    lines = [
        f"Tone: {v.tone}",
        f"Formality: {v.formality}",
        f"Summary: {v.persona_summary}",
    ]
    if v.signature_phrases:
        lines.append("Signature phrases: " + ", ".join(v.signature_phrases[:12]))
    if v.avoid_phrases:
        lines.append("Avoid: " + ", ".join(v.avoid_phrases[:12]))
    if bundle and bundle.to_prompt_context().strip():
        lines.append("\n## Context bundle (truncated)\n" + bundle.to_prompt_context()[:4000])
    return "\n".join(lines)


def _brand_block(tokens: BrandTokens) -> str:
    return json.dumps(
        {
            "primary": tokens.primary,
            "secondary": tokens.secondary,
            "display_font": tokens.display_font,
            "body_font": tokens.body_font,
        },
        indent=2,
    )


class BaseComposer:
    """Workflow-specific composer — subclass sets ``prompt_file`` and ``schema``."""

    role: str = "composer"
    workflow_key: str = "generic"
    prompt_file: str = "generic.v1.md"
    schema: type[BaseModel] = ComponentTree

    def _build_system_prompt(self, plan: PagePlan, bundle: ContextBundle | None) -> str:
        base = load_composer_prompt(self.prompt_file)
        if not base:
            base = "You are Forge's page composer. Output JSON only matching the schema."
        base = base.replace("{{ voice_profile_summary }}", _voice_block(plan, bundle))
        base = base.replace("{{ brand_tokens_json }}", _brand_block(plan.brand_tokens))
        base = base.replace("{{ component_catalog }}", catalog_markdown_summary())
        return base

    def _build_user_prompt(
        self,
        plan: PagePlan,
        bundle: ContextBundle | None,
        intent: PageIntent,
        *,
        user_prompt: str,
    ) -> str:
        payload = {
            "user_prompt": user_prompt,
            "intent": intent.model_dump(mode="json"),
            "page_plan": {
                "workflow": plan.workflow,
                "sections": [s.model_dump() for s in plan.sections],
                "data_hints": plan.data_hints,
                "component_hints": plan.component_hints,
            },
        }
        return json.dumps(payload, indent=2)

    async def compose(
        self,
        *,
        plan: PagePlan,
        bundle: ContextBundle | None,
        intent: PageIntent,
        user_prompt: str,
        provider: str | None,
        db: AsyncSession | None,
        organization_id: UUID | None,
        form_action: str,
        org_slug: str,  # noqa: ARG002 — reserved for future asset URLs
        page_slug: str,  # noqa: ARG002
    ) -> ComposedPage:
        system = self._build_system_prompt(plan, bundle)
        user = self._build_user_prompt(plan, bundle, intent, user_prompt=user_prompt)
        result = await structured_completion(
            role=self.role,
            schema=self.schema,
            system_prompt=system,
            user_prompt=user,
            provider=provider,
            db=db,
            organization_id=organization_id,
        )

        metadata: dict[str, Any] = {"workflow": self.workflow_key, "safety_flags": []}

        if isinstance(result, ProposalComponentTree):
            ok, sub, tax, total = validate_proposal_tree(result)
            metadata["proposal_math_ok"] = ok
            metadata["subtotal_cents"] = sub
            metadata["tax_cents"] = tax
            metadata["total_cents"] = total
            if not ok:
                logger.warning("proposal_math_mismatch server=%s client=%s", sub, result.subtotal_cents)
            tree: ComponentTree | ProposalComponentTree = result
        else:
            t = result
            raw = t.model_dump()
            cleaned, flags = sanitize_component_tree(raw)
            metadata["safety_flags"] = flags
            tree = ComponentTree.model_validate(cleaned)

        html = render_full_document(
            tree,
            plan.brand_tokens,
            form_action=form_action,
        )
        fs = extract_form_schema_hints(tree)
        if fs:
            metadata["form_schema_hints"] = fs
        return ComposedPage(html=html, tree=tree, metadata=metadata)
