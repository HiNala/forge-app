"""LLM provider protocol — Mission 03.

Production traffic uses :func:`app.services.ai.router.completion_text` (LiteLLM) for a
single provider-agnostic path with cross-provider routing and fallbacks. Native SDK
adapters may implement this protocol for tests or specialized call sites.
"""

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass
class LLMResponse:
    text: str
    model: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    cache_hit: bool = False
    raw: Any = None


class LLMProvider(Protocol):
    async def chat(self, messages: list[dict[str, Any]], **kwargs: Any) -> LLMResponse: ...

    async def stream_chat(self, messages: list[dict[str, Any]], **kwargs: Any) -> Any: ...

    def estimate_tokens(self, messages: list[dict[str, Any]]) -> int: ...
