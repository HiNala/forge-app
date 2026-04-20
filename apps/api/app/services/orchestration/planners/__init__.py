"""Workflow-specific deterministic planners — Mission O-02."""

from __future__ import annotations

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PAGE_TYPE_TO_WORKFLOW, PageIntent
from app.services.orchestration.planning_models import PagePlan

from .contact_form import plan_contact_form
from .default import plan_default
from .landing import plan_landing
from .menu import plan_menu
from .pitch_deck import plan_pitch_deck
from .proposal import plan_proposal
from .rsvp import plan_rsvp


def plan_for_intent(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
    """Pick a planner from workflow / page_type."""
    wf: str = intent.workflow
    if wf == "other":
        wf = PAGE_TYPE_TO_WORKFLOW.get(intent.page_type, "other")
    if wf == "contact_form":
        return plan_contact_form(intent, bundle)
    if wf == "proposal":
        return plan_proposal(intent, bundle)
    if wf == "pitch_deck":
        return plan_pitch_deck(intent, bundle)
    if wf == "landing" or wf == "promotion" or wf == "gallery":
        return plan_landing(intent, bundle)
    if wf == "menu":
        return plan_menu(intent, bundle)
    if wf == "event_rsvp":
        return plan_rsvp(intent, bundle)
    return plan_default(intent, bundle)
