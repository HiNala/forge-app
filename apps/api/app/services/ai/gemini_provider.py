"""Gemini adapter — stub."""

from __future__ import annotations

from typing import Any, NoReturn


class GeminiProvider:
    async def complete(self, *args: Any, **kwargs: Any) -> NoReturn:
        raise NotImplementedError

    async def stream(self, *args: Any, **kwargs: Any) -> NoReturn:
        raise NotImplementedError
