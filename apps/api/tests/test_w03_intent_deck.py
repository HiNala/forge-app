"""W-03 — heuristic pitch_deck intent when the LLM tier is unavailable."""

from __future__ import annotations

import pytest

from app.services.ai.exceptions import LLMConfigurationError
from app.services.orchestration.intent import parse_intent


@pytest.mark.asyncio
async def test_parse_intent_fallback_pitch_deck_keywords(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fail(*_a: object, **_k: object) -> None:
        raise LLMConfigurationError("no llm")

    monkeypatch.setattr(
        "app.services.orchestration.intent.structured_completion",
        _fail,
    )
    intent = await parse_intent(
        "Investor pitch deck for my seed-stage SaaS — 10 slides",
        brand_hint=None,
        provider=None,
    )
    assert intent.workflow == "pitch_deck"
    assert intent.page_type == "pitch_deck"
    assert intent.deck_kind == "investor_pitch"
