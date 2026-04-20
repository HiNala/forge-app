"""Unified LLM types for provider adapters (Mission O-01)."""

from __future__ import annotations

from typing import Any, Literal, TypeVar

from pydantic import BaseModel

ProviderName = Literal["openai", "anthropic", "gemini"]

FinishReason = Literal["stop", "length", "tool_use", "content_filter", "error"]


class Message(BaseModel):
    role: Literal["system", "user", "assistant", "tool"]
    content: str
    name: str | None = None
    tool_call_id: str | None = None


class ToolCallDelta(BaseModel):
    id: str | None = None
    name: str | None = None
    arguments_fragment: str | None = None


class CompletionChunk(BaseModel):
    kind: Literal[
        "text",
        "tool_call_start",
        "tool_call_delta",
        "tool_call_end",
        "finish",
        "error",
    ]
    text: str | None = None
    tool_call: ToolCallDelta | None = None
    finish_reason: FinishReason | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    cost_cents: int | None = None
    error_message: str | None = None


class CompletionResult(BaseModel):
    text: str
    model: str
    provider: ProviderName
    input_tokens: int | None = None
    output_tokens: int | None = None
    cost_cents: int | None = None
    finish_reason: FinishReason | None = "stop"
    raw: Any = None


T = TypeVar("T", bound=BaseModel)
