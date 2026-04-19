"""API payloads for pitch decks (W-03)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class DeckOut(BaseModel):
    page_id: UUID
    organization_id: UUID
    deck_kind: str
    narrative_framework: str | None
    target_audience: str | None = None
    slide_count: int
    slides: list[Any]
    theme: dict[str, Any]
    speaker_notes: dict[str, Any] | None = None
    transitions: str | None = None
    locked_by_user_id: UUID | None = None
    locked_at: Any = None
    last_exported_at: Any = None
    last_exported_format: str | None = None
    updated_at: Any = None

    model_config = {"from_attributes": True}


class DeckPatch(BaseModel):
    deck_kind: str | None = None
    narrative_framework: str | None = None
    target_audience: str | None = None
    slides: list[Any] | None = None
    theme: dict[str, Any] | None = None
    speaker_notes: dict[str, Any] | None = None
    transitions: str | None = None


class DeckExportIn(BaseModel):
    format: str = Field(pattern="^(pptx|pdf|keynote|google_slides)$")


class DeckExportOut(BaseModel):
    status: str = "queued"
    format: str
    message: str
