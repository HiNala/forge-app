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


def _prompt_suggests_booking(prompt: str) -> bool:
    return bool(_BOOKING_RE.search(prompt))


INTENT_TAXONOMY = """
Workflow taxonomy (pick exactly one `workflow`):
- contact_form: lead capture, contact us, get in touch, quote request form.
- proposal: scope of work, estimate, bid, contractor proposal.
- pitch_deck: investor deck, pitch slides, fundraising deck.
- landing: marketing landing, product page, promotion (single scroll page).
- menu: restaurant menu, food & drink list.
- event_rsvp: RSVP, register for event, save the date response.
- gallery: photo gallery, portfolio grid (visual-first).
- promotion: sale, limited offer, campaign landing (can overlap landing).
- other: does not fit above; still commit to best page_type.

Rules:
- Never ask the user a question — always choose the most likely workflow.
- If unclear, lower `confidence` and populate `alternatives` with 1–2 other workflows.
- When you infer pricing, client names, or rates not in the prompt, add an `assumptions` entry.
- Map `workflow` to Forge `page_type` consistently (contact_form → contact-form, event_rsvp → rsvp, etc.).
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
    system = (load_prompt("intent_system") or "You are Forge's intent parser.").strip()
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
