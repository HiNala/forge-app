"""Public marketing demo (anonymous, rate-limited)."""

from typing import Literal

from pydantic import BaseModel, Field


class PublicDemoRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=8000)
    provider: Literal["openai", "anthropic", "gemini"] | None = None
