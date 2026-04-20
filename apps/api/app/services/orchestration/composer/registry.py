"""Map workflows to composer instances."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.context.models import ContextBundle
from app.services.orchestration.composer.base import BaseComposer
from app.services.orchestration.composer.composed_page import ComposedPage
from app.services.orchestration.composer.contact import ContactFormComposer
from app.services.orchestration.composer.generic import GenericComposer
from app.services.orchestration.composer.landing import LandingComposer, PromotionComposer
from app.services.orchestration.composer.menu_rsvp_gallery import GalleryComposer, MenuComposer, RsvpComposer
from app.services.orchestration.composer.proposal_composer import ProposalComposer
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan

_COMPOSERS: dict[str, BaseComposer] = {
    "contact_form": ContactFormComposer(),
    "landing": LandingComposer(),
    "promotion": PromotionComposer(),
    "menu": MenuComposer(),
    "event_rsvp": RsvpComposer(),
    "gallery": GalleryComposer(),
    "proposal": ProposalComposer(),
    "generic": GenericComposer(),
}


def workflow_key_for_intent(intent: PageIntent) -> str:
    """Resolve registry key from intent / page_type."""
    pt = intent.page_type
    wf = intent.workflow
    if wf == "gallery":
        return "gallery"
    if wf == "promotion":
        return "promotion"
    if pt in ("contact-form", "booking-form"):
        return "contact_form"
    if pt == "landing":
        return "landing"
    if pt == "menu":
        return "menu"
    if pt == "rsvp":
        return "event_rsvp"
    if pt == "proposal":
        return "proposal"
    if pt == "custom":
        return "generic"
    if wf in ("contact_form", "landing", "menu", "event_rsvp", "proposal"):
        return wf
    return "generic"


async def compose_with_best_agent(
    *,
    plan: PagePlan,
    bundle: ContextBundle | None,
    intent: PageIntent,
    user_prompt: str,
    provider: str | None,
    db: AsyncSession | None,
    organization_id: UUID | None,
    form_action: str,
    org_slug: str,
    page_slug: str,
) -> ComposedPage:
    """Run the best-matching expert composer."""
    key = workflow_key_for_intent(intent)
    composer = _COMPOSERS.get(key, _COMPOSERS["generic"])
    return await composer.compose(
        plan=plan,
        bundle=bundle,
        intent=intent,
        user_prompt=user_prompt,
        provider=provider,
        db=db,
        organization_id=organization_id,
        form_action=form_action,
        org_slug=org_slug,
        page_slug=page_slug,
    )
