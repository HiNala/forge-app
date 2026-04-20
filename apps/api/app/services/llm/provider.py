"""Provider protocol + LiteLLM-backed unified implementation (Mission O-01).

Native OpenAI / Anthropic / Gemini SDKs can implement the same protocol later; production
uses LiteLLM for one normalization surface (Ken Thompson: small composable adapters).
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from typing import Any, Protocol, runtime_checkable

from litellm import acompletion

from app.services.llm.pricing import estimate_cost_cents
from app.services.llm.types import (
    CompletionChunk,
    CompletionResult,
    FinishReason,
    Message,
    ProviderName,
    ToolCallDelta,
)

logger = logging.getLogger(__name__)


def _messages_to_litellm(messages: list[Message]) -> list[dict[str, Any]]:
    return [m.model_dump(exclude_none=True) for m in messages]


def _provider_from_model(model: str) -> ProviderName:
    m = model.lower()
    if "claude" in m or "anthropic" in m:
        return "anthropic"
    if "gemini" in m or "google" in m:
        return "gemini"
    return "openai"


@runtime_checkable
class LLMProvider(Protocol):
    name: ProviderName

    async def complete(
        self,
        messages: list[Message],
        *,
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        response_schema: type[Any] | None = None,
        timeout_seconds: float = 60.0,
        system_prompt: str | None = None,
    ) -> CompletionResult: ...

    def stream_complete(
        self,
        messages: list[Message],
        *,
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        timeout_seconds: float = 60.0,
        system_prompt: str | None = None,
    ) -> AsyncIterator[CompletionChunk]: ...


class LiteLLMUnifiedProvider:
    """Single adapter: LiteLLM routes to OpenAI / Anthropic / Gemini by model id."""

    name: ProviderName = "openai"

    def __init__(self, default_provider: ProviderName = "openai") -> None:
        self.name = default_provider

    async def complete(
        self,
        messages: list[Message],
        *,
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        response_schema: type[Any] | None = None,
        timeout_seconds: float = 60.0,
        system_prompt: str | None = None,
    ) -> CompletionResult:
        msgs = _messages_to_litellm(messages)
        if system_prompt:
            msgs = [{"role": "system", "content": system_prompt}, *msgs]

        kwargs: dict[str, Any] = {
            "model": model,
            "messages": msgs,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "timeout": timeout_seconds,
            "max_retries": 0,
        }
        if response_schema is not None:
            try:
                schema = response_schema.model_json_schema()
                kwargs["response_format"] = {
                    "type": "json_schema",
                    "json_schema": {
                        "name": response_schema.__name__,
                        "schema": schema,
                        "strict": True,
                    },
                }
            except Exception:
                kwargs["response_format"] = {"type": "json_object"}

        resp = await acompletion(**kwargs)
        text = ""
        if resp.choices and resp.choices[0].message:
            text = resp.choices[0].message.content or ""
        usage = getattr(resp, "usage", None)
        pt = getattr(usage, "prompt_tokens", None) if usage else None
        ct = getattr(usage, "completion_tokens", None) if usage else None
        cost = estimate_cost_cents(model, input_tokens=pt, output_tokens=ct)
        return CompletionResult(
            text=text.strip(),
            model=model,
            provider=_provider_from_model(model),
            input_tokens=pt,
            output_tokens=ct,
            cost_cents=cost,
            finish_reason="stop",
            raw=resp,
        )

    async def stream_complete(
        self,
        messages: list[Message],
        *,
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        timeout_seconds: float = 60.0,
        system_prompt: str | None = None,
    ) -> AsyncIterator[CompletionChunk]:
        msgs = _messages_to_litellm(messages)
        if system_prompt:
            msgs = [{"role": "system", "content": system_prompt}, *msgs]
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": msgs,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "timeout": timeout_seconds,
            "max_retries": 0,
            "stream": True,
        }
        stream = await acompletion(**kwargs)
        async for chunk in stream:  # type: ignore[union-attr]
            try:
                choice = chunk.choices[0]
                delta = choice.delta
                content = getattr(delta, "content", None) if delta else None
                if content:
                    yield CompletionChunk(kind="text", text=content)
                tc = getattr(delta, "tool_calls", None) if delta else None
                if tc:
                    for t in tc:
                        fn = getattr(t, "function", None)
                        name = getattr(fn, "name", None) if fn else None
                        yield CompletionChunk(
                            kind="tool_call_delta",
                            tool_call=ToolCallDelta(
                                id=getattr(t, "id", None),
                                name=name,
                                arguments_fragment=getattr(fn, "arguments", None) if fn else None,
                            ),
                        )
                fr = getattr(choice, "finish_reason", None)
                if fr:
                    yield CompletionChunk(
                        kind="finish",
                        finish_reason=_normalize_finish(fr),
                    )
            except Exception as e:
                logger.warning("llm.stream_chunk_parse %s", e)
                yield CompletionChunk(kind="error", error_message=str(e))


def _normalize_finish(fr: str | None) -> FinishReason:
    if fr in ("stop", "length", "content_filter"):
        return fr  # type: ignore[return-value]
    if fr == "tool_calls":
        return "tool_use"
    return "error"
