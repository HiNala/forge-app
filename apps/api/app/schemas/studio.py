"""Studio / SSE request bodies."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class StudioGenerateRequest(BaseModel):
    prompt: str = Field(examples=["Small jobs booking page for Reds Construction"])
    page_id: UUID | None = Field(default=None, examples=[None])
    provider: Literal["openai", "anthropic", "gemini"] = Field(default="openai")
    forced_workflow: str | None = Field(
        default=None,
        description=(
            "Optional — user disambiguation overrides auto intent for this generation. "
            "Use page-backed types (e.g. contact-form, survey, quiz, coming_soon, resume, link_in_bio, "
            "gallery) or marketing keys from /workflows."
        ),
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
    """Follow-up generation after clarify chip — same pipeline as `/generate` with locked workflow."""

    workflow: str = Field(
        description="Workflow key chosen from clarify chips (maps to `forced_workflow` on generate).",
        examples=["contact_form"],
    )
    prompt: str = Field(
        min_length=1,
        description="Next user message after workflow selection (required — no empty continue).",
    )
    page_id: UUID | None = Field(
        default=None,
        description="Existing draft page when refining after clarify (optional).",
    )
    provider: Literal["openai", "anthropic", "gemini"] = Field(default="openai")
    session_id: str = Field(
        default="default",
        description="Studio session key for grouped attachments (matches `/generate`).",
    )
    vision_attachment_ids: list[UUID] = Field(
        default_factory=list,
        description="Vision attachment ids to pass through (matches `/generate`).",
    )
    run_id: UUID | None = Field(
        default=None,
        description="Orchestration run with a pending clarify — checked against clarify_expires_at (AL-03).",
    )
    clarification_choice: str | None = Field(default=None, description="Chosen chip label / key.")
    additional_context: str | None = None


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


class StudioEstimateOut(BaseModel):
    estimated_credits: int
    estimated_cost_cents_hint: int | None = Field(
        default=None,
        description="Rough retail equivalent in USD cents (generation credits × configured overage rate tier).",
    )
    estimated_seconds: int
    confidence: Literal["low", "medium", "high"] = "medium"
