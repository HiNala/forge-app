"""Map IntentSpec (BP-01) onto legacy PageIntent for composition."""

from __future__ import annotations

from app.services.orchestration.models import AlternativeInterpretation, Assumption, PageIntent, VisualDirection
from app.services.orchestration.product_brain.schemas import IntentSpec


def intent_spec_to_page_intent(prompt: str, spec: IntentSpec) -> PageIntent:
    title_seed = (prompt.strip()[:80] or spec.app_type or "Page").strip()
    wf = spec.workflow_classification

    tone = "warm"
    if spec.urgency == "committed":
        tone = "formal"
    elif spec.urgency == "urgent":
        tone = "serious"

    vd: VisualDirection = "minimal"
    if spec.style_preference and spec.style_preference.palette_hint:
        ph = spec.style_preference.palette_hint.lower()
        if "bold" in ph:
            vd = "bold"
        elif "play" in ph:
            vd = "playful"

    alts = [AlternativeInterpretation(workflow=a.workflow, confidence=a.confidence) for a in spec.alternatives]
    assumed = [Assumption(field=a.field, value=a.value, reason=a.reason or "") for a in spec.assumptions]

    return PageIntent(
        workflow=wf,
        confidence=spec.confidence,
        title_suggestion=title_seed,
        headline=spec.primary_goal or title_seed,
        business_type=spec.app_type or None,
        primary_action=spec.primary_goal or None,
        target_customer=spec.target_user or None,
        tone=tone,  # type: ignore[arg-type]
        visual_direction=vd,
        assumptions=assumed,
        alternatives=alts,
    )
