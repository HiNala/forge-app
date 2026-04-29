"""LLM-based intent parsing — Mission O-02."""

from __future__ import annotations

import json
import logging
import re
from typing import Any
from uuid import UUID

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.deck_intent import prompt_suggests_pitch_deck
from app.schemas.proposal_intent import prompt_suggests_proposal
from app.services.ai.exceptions import LLMConfigurationError, LLMProviderError, LLMSchemaError
from app.services.deck_builder import infer_deck_kind, infer_narrative_framework
from app.services.llm.llm_router import structured_completion
from app.services.orchestration.models import AlternativeInterpretation, BookingIntent, FormField, PageIntent
from app.services.orchestration.prompts import load_prompt

logger = logging.getLogger(__name__)

_BOOKING_RE = re.compile(
    r"\b(book(?:ing)?|appointment|appointments|schedule|scheduling|"
    r"reserve|reservation|available times|time slots?|pick a time|consultation)\b",
    re.I,
)

_LINK_IN_BIO_RE = re.compile(
    r"\b(link in bio|link-in-bio|linktree|beacons\.?ai|stan store|bio link|profile link page)\b",
    re.I,
)
_SURVEY_RE = re.compile(
    r"\b(survey|nps\b|customer satisfaction|feedback survey|questionnaire|employee survey|quick poll)\b",
    re.I,
)
_QUIZ_RE = re.compile(
    r"\b(quiz|trivia|personality test|which \w+ are you|test your \w+ knowledge)\b",
    re.I,
)
_RESUME_RE = re.compile(
    r"\b(resume|curriculum vitae|\bcv\b|hire me page|personal site for my career|executive bio page)\b",
    re.I,
)
_COMING_SOON_RE = re.compile(
    r"\b(coming soon|pre-?launch page|launch countdown|join the waitlist before|notify me when we launch)\b",
    re.I,
)
_GALLERY_RE = re.compile(
    r"\b(photo gallery|wedding photography portfolio|portrait photographer|"
    r"showcase my (photos|images|work) in a grid)\b",
    re.I,
)


def _prompt_suggests_booking(prompt: str) -> bool:
    return bool(_BOOKING_RE.search(prompt))


INTENT_TAXONOMY = """
Workflow taxonomy (pick exactly one `workflow`):
- contact_form: lead capture, contact us, get in touch, quote request form.
- proposal: scope of work, estimate, bid, contractor proposal.
- pitch_deck: investor deck, pitch slides, fundraising deck.
- landing: marketing landing, product page, promotion (single scroll page).
- menu: restaurant menu, food & drink list, spa/salon service menu.
- event_rsvp: RSVP, register for event, save the date response.
- gallery: photo gallery, portfolio grid (visual-first, photography/design showcase).
- link_in_bio: one link list for Instagram/TikTok bio, creator links page.
- survey: NPS, customer satisfaction, multi-question research, pollfish-style form.
- quiz: personality quiz, product finder, knowledge test, "which X are you?".
- coming_soon: pre-launch, waitlist, launch countdown, "notify me" before release.
- resume: personal resume site, hire-me page, CV as a page.
- waitlist: generic email capture (without fixed launch / countdown copy).
- promotion: sale, limited offer, campaign landing (can overlap landing).
- portfolio: case study grid for an agency (not pure photography gallery).
- other: does not fit above; still commit to best page_type.

Rules:
- Never ask the user a question — always choose the most likely workflow.
- If unclear, lower `confidence` and populate `alternatives` with 1–2 other workflows.
- When you infer pricing, client names, or rates not in the prompt, add an `assumptions` entry.
- Map `workflow` to GlideDesign `page_type` consistently (contact_form → contact-form, event_rsvp → rsvp, etc.).
"""


async def parse_intent(
    prompt: str,
    *,
    brand_hint: dict[str, Any] | None,
    provider: str | None,
    db: AsyncSession | None = None,
    organization_id: UUID | None = None,
    context_block: str | None = None,
) -> PageIntent:
    """Structured intent via fast tier model; heuristic fallback if LLM unavailable."""
    system = (load_prompt("intent_system") or "You are GlideDesign's intent parser.").strip()
    system = f"{system}\n\n{INTENT_TAXONOMY}"
    user_parts = [f"User request:\n{prompt}"]
    if brand_hint:
        user_parts.append(f"\nBrand context (may be empty):\n{json.dumps(brand_hint)}")
    if context_block:
        user_parts.append(f"\n## Available context\n{context_block}")
    user = "\n".join(user_parts)

    try:
        return await structured_completion(
            role="intent_parser",
            schema=PageIntent,
            system_prompt=system,
            user_prompt=user,
            provider=provider,
            db=db,
            organization_id=organization_id,
        )
    except LLMConfigurationError as e:
        logger.warning("intent_no_llm %s", e)
    except LLMProviderError as e:
        logger.warning("intent_llm_failed %s", e)
    except LLMSchemaError as e:
        logger.warning("intent_schema %s", e)
    except (ValidationError, ValueError, OSError) as e:
        logger.warning("intent_structured_failed %s", e)

    return _heuristic_intent(prompt)


def _heuristic_intent(prompt: str) -> PageIntent:
    if prompt_suggests_proposal(prompt):
        return PageIntent(
            workflow="proposal",
            page_type="proposal",
            confidence=0.72,
            title_suggestion=prompt[:80] or "Proposal",
            headline=prompt[:120] or "Proposal",
            tone="formal",
            sections=["hero-centered", "form-vertical"],
            alternatives=[
                AlternativeInterpretation(workflow="contact_form", confidence=0.28),
            ],
        )
    if prompt_suggests_pitch_deck(prompt):
        return PageIntent(
            workflow="pitch_deck",
            page_type="pitch_deck",
            confidence=0.72,
            title_suggestion=prompt[:80] or "Deck",
            headline=prompt[:120] or "Pitch deck",
            tone="formal",
            sections=["hero-centered"],
            deck_kind=infer_deck_kind(prompt),
            deck_narrative_framework=infer_narrative_framework(prompt),
            alternatives=[
                AlternativeInterpretation(workflow="landing", confidence=0.25),
            ],
        )
    if _LINK_IN_BIO_RE.search(prompt):
        return PageIntent(
            workflow="link_in_bio",
            page_type="link_in_bio",
            confidence=0.78,
            title_suggestion=prompt[:80] or "Link in bio",
            headline=prompt[:120] or "Links",
            tone="playful",
            business_type="creator or small brand",
        )
    if _QUIZ_RE.search(prompt):
        return PageIntent(
            workflow="quiz",
            page_type="quiz",
            confidence=0.75,
            title_suggestion=prompt[:80] or "Quiz",
            headline=prompt[:120] or "Quiz",
            tone="playful",
        )
    if _SURVEY_RE.search(prompt):
        return PageIntent(
            workflow="survey",
            page_type="survey",
            confidence=0.76,
            title_suggestion=prompt[:80] or "Survey",
            headline=prompt[:120] or "We'd love your input",
            tone="warm",
        )
    if _COMING_SOON_RE.search(prompt):
        return PageIntent(
            workflow="coming_soon",
            page_type="coming_soon",
            confidence=0.74,
            title_suggestion=prompt[:80] or "Coming soon",
            headline=prompt[:120] or "Something new is on the way",
            tone="warm",
            primary_action="join the waitlist",
        )
    if _RESUME_RE.search(prompt):
        return PageIntent(
            workflow="resume",
            page_type="resume",
            confidence=0.77,
            title_suggestion=prompt[:80] or "Resume",
            headline=prompt[:120] or "Professional profile",
            tone="formal",
        )
    if _GALLERY_RE.search(prompt):
        return PageIntent(
            workflow="gallery",
            page_type="gallery",
            confidence=0.7,
            title_suggestion=prompt[:80] or "Portfolio",
            headline=prompt[:120] or "Gallery",
            tone="warm",
        )
    if _prompt_suggests_booking(prompt):
        return PageIntent(
            workflow="contact_form",
            page_type="booking-form",
            confidence=0.68,
            title_suggestion=(prompt[:80] or "Book a time").strip(),
            headline=(prompt[:120] or "Schedule a time").strip(),
            tone="warm",
            sections=["hero-centered", "form-vertical"],
            booking=BookingIntent(enabled=True),
            fields=[
                FormField(name="name", label="Name", field_type="text", required=True),
                FormField(name="email", label="Email", field_type="email", required=True),
                FormField(
                    name="details",
                    label="What do you need?",
                    field_type="textarea",
                    required=False,
                ),
            ],
            alternatives=[
                AlternativeInterpretation(workflow="contact_form", confidence=0.35),
            ],
        )
    return PageIntent(
        workflow="other",
        page_type="custom",
        confidence=0.55,
        title_suggestion=prompt[:80] or "Page",
        headline=prompt[:120] or "New page",
        tone="warm",
        alternatives=[
            AlternativeInterpretation(workflow="contact_form", confidence=0.35),
            AlternativeInterpretation(workflow="landing", confidence=0.3),
        ],
    )
