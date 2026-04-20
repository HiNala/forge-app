"""LiteLLM router behavior — no real API calls."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.config import settings
from app.services.ai import router as router_mod
from app.services.ai.exceptions import LLMConfigurationError, LLMProviderError


def _response(content: str) -> SimpleNamespace:
    msg = SimpleNamespace(content=content)
    choice = SimpleNamespace(message=msg)
    usage = SimpleNamespace(prompt_tokens=1, completion_tokens=2, total_tokens=3)
    return SimpleNamespace(choices=[choice], usage=usage)


@pytest.mark.asyncio
async def test_completion_text_raises_when_no_api_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "")

    with pytest.raises(LLMConfigurationError, match="No LLM API keys"):
        await router_mod.completion_text(
            [{"role": "user", "content": "hi"}],
            task="intent",
        )


@pytest.mark.asyncio
async def test_completion_text_returns_text_and_metadata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test")
    monkeypatch.setattr(settings, "LLM_MODEL_INTENT", "gpt-4o-mini")
    monkeypatch.setattr(settings, "LLM_FALLBACK_MODELS", "")

    mock = AsyncMock(return_value=_response("  trimmed  "))
    monkeypatch.setattr(router_mod, "acompletion", mock)

    text, meta = await router_mod.completion_text(
        [{"role": "user", "content": "x"}],
        task="intent",
    )

    assert text == "trimmed"
    assert meta["model"] == "gpt-4o-mini"
    assert meta["latency_ms"] >= 0
    assert meta.get("total_tokens") == 3
    assert "cost_cents" in meta
    mock.assert_awaited_once()
    call_kw = mock.await_args.kwargs
    assert call_kw["model"] == "gpt-4o-mini"
    assert call_kw["timeout"] == settings.LLM_TIMEOUT_SECONDS


@pytest.mark.asyncio
async def test_completion_text_fallback_on_primary_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test")
    monkeypatch.setattr(settings, "LLM_MODEL_INTENT", "gpt-4o-mini")
    monkeypatch.setattr(settings, "LLM_FALLBACK_MODELS", "gpt-4o")

    async def flaky_acompletion(**kwargs: object) -> SimpleNamespace:
        model = kwargs["model"]
        if model == "gpt-4o-mini":
            raise RuntimeError("primary down")
        return _response("ok")

    monkeypatch.setattr(router_mod, "acompletion", flaky_acompletion)

    text, meta = await router_mod.completion_text(
        [{"role": "user", "content": "x"}],
        task="intent",
    )

    assert text == "ok"
    assert meta["model"] == "gpt-4o"


@pytest.mark.asyncio
async def test_completion_text_all_models_fail_raises_provider_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test")
    monkeypatch.setattr(settings, "LLM_MODEL_INTENT", "gpt-4o-mini")
    monkeypatch.setattr(settings, "LLM_FALLBACK_MODELS", "")

    monkeypatch.setattr(
        router_mod,
        "acompletion",
        AsyncMock(side_effect=RuntimeError("network")),
    )

    with pytest.raises(LLMProviderError, match="All LLM models failed"):
        await router_mod.completion_text(
            [{"role": "user", "content": "x"}],
            task="intent",
        )


@pytest.mark.asyncio
async def test_primary_model_respects_provider_defaults(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Short env model names use provider map when no slash in model id."""
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.setattr(settings, "LLM_MODEL_INTENT", "")
    monkeypatch.setattr(settings, "LLM_DEFAULT_PROVIDER", "anthropic")
    monkeypatch.setattr(settings, "LLM_FALLBACK_MODELS", "")

    captured: dict[str, str] = {}

    async def capture_model(**kwargs: object) -> SimpleNamespace:
        captured["model"] = kwargs["model"]  # type: ignore[assignment]
        return _response("x")

    monkeypatch.setattr(router_mod, "acompletion", capture_model)
    await router_mod.completion_text(
        [{"role": "user", "content": "x"}],
        task="intent",
        provider="anthropic",
    )

    assert "claude" in captured["model"].lower() or "anthropic" in captured["model"].lower()
