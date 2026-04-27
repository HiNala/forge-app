"""Workflow-specific deterministic planners — Mission O-02."""

from __future__ import annotations

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PAGE_TYPE_TO_WORKFLOW, PageIntent
from app.services.orchestration.planning_models import PagePlan

from .coming_soon import plan_coming_soon
from .contact_form import plan_contact_form
from .default import plan_default
from .faq import plan_faq
from .gallery_planner import plan_gallery_page
from .landing import plan_landing
from .link_in_bio import plan_link_in_bio
from .menu import plan_menu
from .pitch_deck import plan_pitch_deck
from .portfolio import plan_portfolio
from .proposal import plan_proposal
from .quiz import plan_quiz
from .resume_planner import plan_resume
from .rsvp import plan_rsvp
from .survey import plan_survey
from .waitlist import plan_waitlist


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
    if wf == "landing" or wf == "promotion":
        return plan_landing(intent, bundle)
    if wf == "gallery":
        return plan_gallery_page(intent, bundle)
    if wf == "menu":
        return plan_menu(intent, bundle)
    if wf == "event_rsvp":
        return plan_rsvp(intent, bundle)
    if wf == "portfolio":
        return plan_portfolio(intent, bundle)
    if wf == "link_in_bio":
        return plan_link_in_bio(intent, bundle)
    if wf == "waitlist":
        return plan_waitlist(intent, bundle)
    if wf == "faq":
        return plan_faq(intent, bundle)
    if wf == "survey":
        return plan_survey(intent, bundle)
    if wf == "quiz":
        return plan_quiz(intent, bundle)
    if wf == "coming_soon":
        return plan_coming_soon(intent, bundle)
    if wf == "resume":
        return plan_resume(intent, bundle)
    return plan_default(intent, bundle)
