"""W-04 workflow clarify — heuristic ambiguity."""

from app.services.orchestration.models import PageIntent
from app.services.orchestration.workflow_confidence import maybe_workflow_clarify


def test_no_clarify_when_confident_proposal_keywords() -> None:
    prompt = "I need a one-page sales proposal with pricing for Acme Corp"
    intent = PageIntent(page_type="proposal", title_suggestion="Acme")
    assert maybe_workflow_clarify(prompt, intent) is None


def test_clarify_when_vague_but_flagship() -> None:
    prompt = "Something for my client next week"
    intent = PageIntent(page_type="proposal", title_suggestion="x")
    out = maybe_workflow_clarify(prompt, intent)
    assert out is not None
    assert out["default"] == "proposal"
    assert len(out["candidates"]) >= 2


def test_no_clarify_for_non_flagship() -> None:
    prompt = "A landing page"
    intent = PageIntent(page_type="landing", title_suggestion="x")
    assert maybe_workflow_clarify(prompt, intent) is None
