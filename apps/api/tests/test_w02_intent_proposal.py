"""W-02 — heuristic proposal intent when the LLM tier is unavailable."""

from __future__ import annotations

import pytest

from app.services.ai.exceptions import LLMConfigurationError
from app.services.orchestration.intent import parse_intent


@pytest.mark.asyncio
async def test_parse_intent_fallback_proposal_keywords(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fail(*_a: object, **_k: object) -> None:
        raise LLMConfigurationError("no llm")

    monkeypatch.setattr(
        "app.services.orchestration.intent.structured_completion",
        _fail,
    )
    intent = await parse_intent(
        "I need a quote for a 12-foot fence installation — bid due Friday",
        brand_hint=None,
        provider=None,
    )
    assert intent.workflow == "proposal"
    assert intent.page_type == "proposal"
    assert intent.confidence >= 0.5


@pytest.mark.asyncio
async def test_parse_intent_fallback_pitch_deck(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fail(*_a: object, **_k: object) -> None:
        raise LLMConfigurationError("no llm")

    monkeypatch.setattr(
        "app.services.orchestration.intent.structured_completion",
        _fail,
    )
    intent = await parse_intent(
        "Seed deck for investors with traction slide",
        brand_hint=None,
        provider=None,
    )
    assert intent.workflow == "pitch_deck"
