"""Intent parsing — fast model, JSON-only."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, cast
from uuid import UUID

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.schemas.deck_intent import prompt_suggests_pitch_deck
from app.schemas.proposal_intent import prompt_suggests_proposal
from app.services.ai.exceptions import LLMConfigurationError, LLMProviderError
from app.services.ai.router import completion_text
from app.services.deck_builder import infer_deck_kind, infer_narrative_framework
from app.services.orchestration.models import AssemblyPlan, PageIntent
from app.services.orchestration.prompts import load_prompt

logger = logging.getLogger(__name__)


def extract_json_object(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```\w*\n?", "", text)
        text = re.sub(r"\n```\s*$", "", text)
    return cast(dict[str, Any], json.loads(text))


async def parse_intent(
    prompt: str,
    *,
    brand_hint: dict[str, Any] | None,
    provider: str | None,
    db: AsyncSession | None = None,
    organization_id: UUID | None = None,
    context_block: str | None = None,
) -> PageIntent:
    system = load_prompt("intent_system") or "Return JSON only."
    user = f"User request:\n{prompt}\n"
    if brand_hint:
        user += f"\nBrand context (may be empty):\n{json.dumps(brand_hint)}\n"
    if context_block:
        user += f"\n{context_block}\n"
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    strict = "Respond with ONLY a single JSON object. No markdown, no commentary."
    try:
        for attempt in range(2):
            msgs = messages if attempt == 0 else messages + [{"role": "user", "content": strict}]
            try:
                text, _ = await completion_text(
                    msgs,
                    task="intent",
                    provider=provider,
                    temperature=0.0,
                    db=db,
                    organization_id=organization_id,
                )
                data = extract_json_object(text)
                return PageIntent.model_validate(data)
            except (json.JSONDecodeError, ValueError, TypeError, ValidationError) as e:
                logger.warning("intent_parse_attempt_%s %s", attempt + 1, e)
                continue
    except LLMConfigurationError as e:
        logger.warning("intent_no_llm %s", e)
    except LLMProviderError as e:
        logger.warning("intent_llm_failed %s", e)
    if prompt_suggests_proposal(prompt):
        return PageIntent(
            page_type="proposal",
            title_suggestion=prompt[:80] or "Proposal",
            tone="formal",
            sections=["hero-centered", "form-vertical"],
        )
    if prompt_suggests_pitch_deck(prompt):
        return PageIntent(
            page_type="pitch_deck",
            title_suggestion=prompt[:80] or "Deck",
            tone="formal",
            sections=["hero-centered"],
            deck_kind=infer_deck_kind(prompt),
            deck_narrative_framework=infer_narrative_framework(prompt),
        )
    return PageIntent(page_type="custom", title_suggestion=prompt[:80] or "Page", tone="warm")


async def compose_assembly_plan(
    intent: PageIntent,
    *,
    provider: str | None,
    db: AsyncSession | None = None,  # noqa: ARG001
    organization_id: UUID | None = None,  # noqa: ARG001
) -> AssemblyPlan:
    from app.services.orchestration.page_composer import default_assembly_plan

    system = load_prompt("compose_system") or "Return JSON only."
    user = json.dumps({"intent": intent.model_dump(mode="json")}, indent=2)
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    try:
        text, meta = await completion_text(
            messages,
            task="compose",
            provider=provider,
            temperature=0.3,
            db=db,
            organization_id=organization_id,
        )
        pt = int(meta.get("prompt_tokens") or 0)
        ct = int(meta.get("completion_tokens") or 0)
        if pt > 5000 or ct > 3000:
            logger.warning("compose_token_budget_high prompt=%s completion=%s", pt, ct)
        data = extract_json_object(text)
        try:
            plan = AssemblyPlan.model_validate(data)
        except ValidationError as e:
            raise ValueError(str(e)) from e
        if not plan.sections:
            raise ValueError("empty sections")
        if settings.LLM_LOG_METRICS:
            logger.info("compose.plan_ok %s", meta.get("model"))
        return plan
    except Exception as e:
        logger.warning("compose.plan_fallback %s", e)
        return default_assembly_plan(intent)
