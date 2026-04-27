"""P-06 — deterministic planner shape checks (no LLM). ~32 cases across new workflows."""

from __future__ import annotations

import pytest

from app.services.orchestration.models import PageIntent
from app.services.orchestration.planners import plan_for_intent

_TITLES = ("", "Launch feedback", "Unicode 测试 — café")

_CASES: list[tuple[str, str, str, int, frozenset[str]]] = [
    ("survey", "survey", "survey", 4, frozenset({"intro", "questions", "thankyou", "footer"})),
    ("quiz", "quiz", "quiz", 4, frozenset({"intro", "questions", "result", "footer"})),
    ("coming_soon", "coming_soon", "coming_soon", 4, frozenset({"hero", "capture", "teaser", "footer"})),
    ("gallery", "gallery", "gallery", 5, frozenset({"hero", "grid", "about", "inquiry", "footer"})),
    ("resume", "resume", "resume", 7, frozenset({"hero", "summary", "experience", "projects", "skills", "education", "footer"})),
    ("link_in_bio", "link_in_bio", "link_in_bio", 3, frozenset({"profile", "links", "footer"})),
    ("event_rsvp", "rsvp", "event_rsvp", 3, frozenset({"hero", "form", "footer"})),
    ("menu", "menu", "menu", 3, frozenset({"hero", "menu_body", "footer"})),
]


@pytest.mark.parametrize("title", _TITLES)
@pytest.mark.parametrize("workflow,page_type,expect_wf,min_sections,ids", _CASES)
def test_p06_planner_sections_stable(
    title: str,
    workflow: str,
    page_type: str,
    expect_wf: str,
    min_sections: int,
    ids: frozenset[str],
) -> None:
    intent = PageIntent(
        workflow=workflow,  # type: ignore[assignment]
        page_type=page_type,  # type: ignore[assignment]
        title=title or "Untitled",
        headline="Headline",
        subheadline="Sub",
    )
    plan = plan_for_intent(intent, None)
    assert plan.workflow == expect_wf
    assert len(plan.sections) >= min_sections
    got = {s.id for s in plan.sections}
    assert ids <= got
