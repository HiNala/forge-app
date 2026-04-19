"""Studio / SSE request bodies."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class StudioGenerateRequest(BaseModel):
    prompt: str = Field(examples=["Small jobs booking page for Reds Construction"])
    page_id: UUID | None = Field(default=None, examples=[None])
    provider: Literal["openai", "anthropic", "gemini"] = Field(default="openai")
    forced_workflow: (
        Literal["contact-form", "booking-form", "proposal", "pitch_deck"] | None
    ) = Field(
        default=None,
        description="Optional — user disambiguation overrides auto intent for this generation.",
    )


class StudioRefineRequest(BaseModel):
    message: str = Field(examples=["Make the hero more minimal"])
    page_id: UUID = Field(examples=["00000000-0000-4000-8000-000000000002"])
    provider: Literal["openai", "anthropic", "gemini"] | None = Field(default=None)


class StudioSectionEditRequest(BaseModel):
    page_id: UUID = Field(examples=["00000000-0000-4000-8000-000000000002"])
    section_id: str = Field(examples=["hero-centered-0"])
    html: str | None = Field(
        default=None,
        description="Optional; server extracts from page when omitted.",
    )
    instruction: str = Field(examples=["Change headline to Hello"])
    provider: Literal["openai", "anthropic", "gemini"] | None = Field(default=None)


class StudioMessageCreateRequest(BaseModel):
    role: str = Field(examples=["user"])
    content: str = Field(examples=["Add a phone field"])


class StudioSectionEditResponse(BaseModel):
    current_html: str


class StudioMessageOut(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    role: str
    content: str
    created_at: datetime


class StudioConversationResponse(BaseModel):
    page_id: UUID
    conversation_id: UUID
    messages: list[StudioMessageOut]
