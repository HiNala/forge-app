"""W-04 — workflow clarify heuristic + pipeline hook."""

from app.services.orchestration.models import PageIntent
from app.services.orchestration.workflow_clarify import build_workflow_clarify


def test_clarify_when_multiple_workflows_match_custom_intent() -> None:
    prompt = "I need a client quote and also a contact form for leads this week"
    intent = PageIntent(page_type="custom", title_suggestion="X")
    out = build_workflow_clarify(prompt, intent)
    assert out is not None
    assert "candidates" in out
    assert len(out["candidates"]) >= 2
    assert out["default"] in {c["workflow"] for c in out["candidates"]}


def test_no_clarify_when_intent_is_specific() -> None:
    prompt = "same ambiguous text"
    intent = PageIntent(page_type="proposal", title_suggestion="X")
    assert build_workflow_clarify(prompt, intent) is None
