"""LLMRouter — role-based models, fallbacks, structured outputs (Mission O-01)."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai import router as ai_router
from app.services.ai.exceptions import LLMSchemaError
from app.services.llm.pricing import estimate_cost_cents
from app.services.llm.types import Message

logger = logging.getLogger(__name__)

TaskName = Literal["intent", "compose", "section_edit", "review"]

ROLE_TO_TASK: dict[str, TaskName] = {
    "intent_parser": "intent",
    "composer": "compose",
    "section_editor": "section_edit",
    "voice_inferrer": "intent",
    "reviewer": "review",
}


@dataclass
class ModelRoute:
    role: str
    primary: tuple[str, str]  # (provider hint, model id for LiteLLM)
    fallbacks: list[tuple[str, str]] = field(default_factory=list)
    temperature: float = 0.2
    max_tokens: int = 2000


# Mission table — env `LLM_MODEL_*` still overrides via ai.router._primary_model
ROUTES: dict[str, ModelRoute] = {
    "intent_parser": ModelRoute(
        role="intent_parser",
        primary=("openai", "gpt-4o-mini"),
        fallbacks=[
            ("anthropic", "anthropic/claude-3-5-haiku-20241022"),
            ("gemini", "gemini/gemini-2.0-flash"),
        ],
        temperature=0.2,
        max_tokens=2000,
    ),
    "composer": ModelRoute(
        role="composer",
        primary=("openai", "gpt-4o"),
        fallbacks=[
            ("anthropic", "anthropic/claude-3-5-sonnet-20241022"),
            ("gemini", "gemini/gemini-2.0-flash"),
        ],
        temperature=0.6,
        max_tokens=8000,
    ),
    "section_editor": ModelRoute(
        role="section_editor",
        primary=("openai", "gpt-4o-mini"),
        fallbacks=[
            ("anthropic", "anthropic/claude-3-5-haiku-20241022"),
            ("gemini", "gemini/gemini-2.0-flash"),
        ],
        temperature=0.5,
        max_tokens=2000,
    ),
    "reviewer": ModelRoute(
        role="reviewer",
        primary=("openai", "gpt-4o"),
        fallbacks=[
            ("anthropic", "anthropic/claude-3-5-sonnet-20241022"),
            ("gemini", "gemini/gemini-2.0-flash"),
        ],
        temperature=0.3,
        max_tokens=6000,
    ),
}

async def structured_completion[T: BaseModel](
    *,
    role: str,
    schema: type[T],
    system_prompt: str,
    user_prompt: str,
    provider: str | None = None,
    db: AsyncSession | None = None,
    organization_id: UUID | None = None,
) -> T:
    """Parse JSON into `schema`; retry once with validation error appended."""
    route = ROUTES.get(role)
    task = ROLE_TO_TASK.get(role, "intent")
    if route is None:
        raise ValueError(f"Unknown LLM role: {role}")

    async def _once(user_extra: str = "") -> T:
        up = user_prompt + user_extra
        guidance = (
            f"\n\nRespond with a single JSON object only that validates against this schema "
            f"(keys and types): {schema.model_json_schema()}"
        )
        messages = [
            {"role": "system", "content": system_prompt + guidance},
            {"role": "user", "content": up},
        ]
        text, meta = await ai_router.completion_text(
            messages,
            task=task,
            provider=provider,
            temperature=route.temperature,
            db=db,
            organization_id=organization_id,
        )
        raw = text.strip()
        if raw.startswith("```"):
            raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        data: Any
        try:
            import json

            data = json.loads(raw)
        except Exception as e:
            raise LLMSchemaError(f"Invalid JSON from model: {e}") from e
        return schema.model_validate(data)

    try:
        return await _once()
    except (ValidationError, LLMSchemaError) as e:
        err_txt = str(e)
        logger.warning("llm.structured_retry %s", err_txt[:200])
        try:
            return await _once(
                user_extra=(
                    f"\n\nYour previous response failed validation:\n{err_txt}\n"
                    f"Return JSON only, matching the schema exactly."
                ),
            )
        except Exception as e2:
            raise LLMSchemaError(f"Structured output failed after retry: {e2}") from e2


async def structured_stream[T: BaseModel](
    *,
    role: str,
    schema: type[T],
    system_prompt: str,
    user_prompt: str,
    provider: str | None = None,
    db: AsyncSession | None = None,
    organization_id: UUID | None = None,
) -> T:
    """Single-shot structured output (Mission O-03). Streaming partials deferred to provider work."""
    return await structured_completion(
        role=role,
        schema=schema,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        provider=provider,
        db=db,
        organization_id=organization_id,
    )


def record_fallback_metric(primary: str, fallback: str) -> None:
    logger.info(
        'event=llm.fallback.triggered primary="%s" fallback="%s"',
        primary,
        fallback,
    )


# --- Optional: thin wrapper that uses LiteLLMUnifiedProvider for non-router paths ---


async def completion_with_cost(
    messages: list[Message],
    *,
    role: str,
    provider: str | None = None,
    db: AsyncSession | None = None,
    organization_id: UUID | None = None,
) -> tuple[str, dict[str, Any]]:
    """Delegates to ai.router and adds cost_cents to metadata."""
    task = ROLE_TO_TASK.get(role, "intent")
    dict_msgs = [m.model_dump(exclude_none=True) for m in messages]
    text, meta = await ai_router.completion_text(
        dict_msgs,
        task=task,
        provider=provider,
        db=db,
        organization_id=organization_id,
    )
    model = str(meta.get("model", ""))
    pt = meta.get("prompt_tokens")
    ct = meta.get("completion_tokens")
    cost = estimate_cost_cents(model, input_tokens=pt, output_tokens=ct)
    meta = {**meta, "cost_cents": cost}
    return text, meta
