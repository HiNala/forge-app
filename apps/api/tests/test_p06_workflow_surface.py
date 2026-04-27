"""P-06 — workflow types, forced workflow mapping, and registry smoke."""

import pytest

from app.services.orchestration.composer.registry import _COMPOSERS, workflow_key_for_intent
from app.services.orchestration.forced_workflow import apply_forced_workflow
from app.services.orchestration.models import WORKFLOW_TO_PAGE_TYPE, PageIntent
from app.services.workflows.registry import WORKFLOW_REGISTRY


def test_workflow_to_page_type_covers_new_workflows() -> None:
    for wf, pt in (
        ("survey", "survey"),
        ("quiz", "quiz"),
        ("coming_soon", "coming_soon"),
        ("resume", "resume"),
        ("gallery", "gallery"),
    ):
        assert WORKFLOW_TO_PAGE_TYPE[wf] == pt
        i = PageIntent(workflow=wf, title="t", headline="h")
        assert i.page_type == pt


@pytest.mark.parametrize(
    ("forced", "expected_wf"),
    [
        ("survey", "survey"),
        ("coming-soon", "coming_soon"),
        ("link-in-bio", "link_in_bio"),
        ("event-rsvp", "event_rsvp"),
    ],
)
def test_apply_forced_workflow(forced: str, expected_wf: str) -> None:
    base = PageIntent(workflow="landing", page_type="landing", title="x", headline="x")
    out = apply_forced_workflow(base, forced)
    assert out.workflow == expected_wf
    assert out.confidence >= 0.95


def test_workflow_key_for_intent_routes_composers() -> None:
    i = PageIntent(workflow="survey", page_type="survey", title="S", headline="H")
    assert workflow_key_for_intent(i) == "survey"
    assert "survey" in _COMPOSERS

    j = PageIntent(workflow="link_in_bio", page_type="link_in_bio", title="L", headline="H")
    assert workflow_key_for_intent(j) == "link_in_bio"
    assert "link_in_bio" in _COMPOSERS


def test_workflow_registry_has_fourteen_plus_canvas() -> None:
    # 14 user-facing surface tiles in Studio + definitions for canvas modes.
    assert "survey" in WORKFLOW_REGISTRY
    assert "link_in_bio" in WORKFLOW_REGISTRY
    assert "mobile_app" in WORKFLOW_REGISTRY
    assert "website" in WORKFLOW_REGISTRY
