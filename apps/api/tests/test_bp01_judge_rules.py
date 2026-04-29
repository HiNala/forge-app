"""BP-01 deterministic judge + intent bridge smoke tests."""

from __future__ import annotations

from app.services.orchestration.product_brain.intent_bridge import intent_spec_to_page_intent
from app.services.orchestration.product_brain.judge_rules import decide_judge
from app.services.orchestration.product_brain.schemas import CritiqueDimension, CritiqueReport, IntentSpec


def test_judge_ships_when_bar_met() -> None:
    scores = {e.value: 8.9 for e in CritiqueDimension}
    cr = CritiqueReport(scores=scores, overall_score=8.9, issues=[], recommended_fixes=[], strengths=[])
    jd = decide_judge(critique=cr, iterations=0, max_iterations=2)
    assert jd.verdict == "ship"


def test_judge_iterates_when_low() -> None:
    scores = {e.value: 7.0 for e in CritiqueDimension}
    cr = CritiqueReport(scores=scores, overall_score=7.1, issues=[], recommended_fixes=[], strengths=[])
    jd = decide_judge(critique=cr, iterations=0, max_iterations=2)
    assert jd.verdict == "iterate"


def test_intent_bridge_roundtrip() -> None:
    spec = IntentSpec(
        app_type="Test",
        workflow_classification="landing",
        primary_goal="Book a demo",
        target_user="SMB owners",
    )
    pi = intent_spec_to_page_intent("Make a landing page", spec)
    assert pi.workflow == "landing"
    assert pi.primary_action == "Book a demo"
