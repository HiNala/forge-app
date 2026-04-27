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
    session_id: str = Field(
        default="default",
        description="Client-side Studio session key for grouped attachments (P-05).",
    )
    vision_attachment_ids: list[UUID] = Field(
        default_factory=list,
        description="Registered studio_attachments to include as vision context (max 5).",
    )


class StudioGenerateContinueRequest(BaseModel):
    """Non-blocking clarify follow-up (F-04 session wiring)."""

    workflow: str = Field(
        description="User-selected workflow key from clarify chips",
        examples=["contact_form"],
    )
    session_id: UUID | None = Field(default=None, description="Optional Studio session id when available")


class StudioRefineRequest(BaseModel):
    message: str = Field(examples=["Make the hero more minimal"])
    page_id: UUID = Field(examples=["00000000-0000-4000-8000-000000000002"])
    provider: Literal["openai", "anthropic", "gemini"] | None = Field(default=None)
    session_id: str = "default"
    vision_attachment_ids: list[UUID] = Field(default_factory=list)


class StudioPresignRequest(BaseModel):
    session_id: str = "default"
    filename: str = "upload.png"
    content_type: str = "image/png"


class StudioPresignOut(BaseModel):
    url: str
    storage_key: str
    max_size_bytes: int


class StudioRegisterAttachmentIn(BaseModel):
    session_id: str = "default"
    storage_key: str
    kind: str = "screenshot"
    mime_type: str
    width: int | None = None
    height: int | None = None
    description: str | None = None


class StudioRegisterAttachmentOut(BaseModel):
    id: UUID
    storage_key: str


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
