"""Mission O-02 — deterministic planners."""

from app.services.context.models import ContextBundle
from app.services.orchestration.models import FormField, PageIntent
from app.services.orchestration.planners import plan_for_intent


def test_contact_form_planner_has_form_section() -> None:
    intent = PageIntent(
        workflow="contact_form",
        page_type="contact-form",
        title_suggestion="Reach us",
        headline="Contact our team",
        fields=[
            FormField(name="name", label="Name", field_type="text", required=True),
        ],
    )
    bundle = ContextBundle()
    plan = plan_for_intent(intent, bundle)
    ids = [s.id for s in plan.sections]
    assert "form" in ids
    assert plan.workflow == "contact_form"


def test_proposal_planner_has_acceptance() -> None:
    intent = PageIntent(
        workflow="proposal",
        page_type="proposal",
        title_suggestion="Fence proposal",
        confidence=0.9,
    )
    plan = plan_for_intent(intent, None)
    assert any(s.id == "acceptance" for s in plan.sections)


def test_plan_for_intent_uses_page_type_when_workflow_other() -> None:
    intent = PageIntent(
        workflow="other",
        page_type="proposal",
        title_suggestion="X",
    )
    plan = plan_for_intent(intent, None)
    assert plan.workflow == "proposal"
