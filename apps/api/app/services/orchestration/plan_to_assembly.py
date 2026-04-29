"""Map deterministic PagePlan to template AssemblyPlan (Mission O-02)."""

from __future__ import annotations

from typing import Any

from app.services.context.models import ContextBundle
from app.services.orchestration.models import AssemblyPlan, PageIntent, SectionPlan
from app.services.orchestration.page_composer import apply_plan_constraints
from app.services.orchestration.planners import plan_for_intent
from app.services.orchestration.planning_models import PagePlan


def page_plan_to_assembly_plan(plan: PagePlan, intent: PageIntent) -> AssemblyPlan:
    """Turn section specs into concrete component plans."""
    ordered = sorted(plan.sections, key=lambda s: s.priority)
    sections: list[SectionPlan] = []
    headline = intent.headline or intent.title_suggestion
    for spec in ordered:
        comp = plan.component_hints.get(spec.id, "hero-centered")
        props: dict[str, Any]
        if comp == "form-vertical":
            fields = plan.data_hints.get("form_fields")
            if not isinstance(fields, list):
                fields = []
            props = {
                "fields": fields,
                "submit_label": "Submit",
            }
        elif comp == "cta-bar":
            props = {
                "text": spec.content_brief[:300],
                "phone": "",
            }
        elif comp == "footer-minimal":
            props = {"footer_text": "Built with GlideDesign"}
        elif comp == "proposal-accept-decline":
            props = {
                "accept_label": "Accept proposal",
                "decline_label": "Decline",
            }
        else:
            props = {
                "headline": headline[:200],
                "subhead": spec.content_brief[:500],
            }
            comp = "hero-centered"
        sections.append(SectionPlan(component=comp, props=props))

    theme = {
        "primary": plan.brand_tokens.primary,
        "secondary": plan.brand_tokens.secondary,
        "mood": intent.tone,
    }
    return AssemblyPlan(theme=theme, sections=sections)


def build_assembly_from_intent(
    intent: PageIntent,
    bundle: ContextBundle | None,
) -> tuple[AssemblyPlan, PagePlan]:
    """Deterministic planner + template mapping (no LLM)."""
    page_plan = plan_for_intent(intent, bundle)
    asm = page_plan_to_assembly_plan(page_plan, intent)
    return apply_plan_constraints(intent, asm), page_plan
