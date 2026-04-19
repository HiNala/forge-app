"""API shapes for availability calendars (W-01)."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AvailabilityCalendarOut(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    source_type: str
    source_ref: str | None
    timezone: str
    business_hours: dict[str, Any]
    buffer_before_minutes: int
    buffer_after_minutes: int
    min_notice_minutes: int
    max_advance_days: int
    slot_duration_minutes: int
    slot_increment_minutes: int
    all_day_events_block: bool
    metadata: dict[str, Any] | None = Field(
        default=None,
        validation_alias="metadata_",
        serialization_alias="metadata",
    )
    last_synced_at: datetime | None
    last_sync_summary: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class AvailabilityCalendarCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    source_type: str = Field(pattern="^(ics_file|ics_url|google)$")
    source_ref: str | None = None
    timezone: str = "UTC"


class AvailabilityCalendarPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    source_ref: str | None = None
    timezone: str | None = None
    business_hours: dict[str, Any] | None = None
    buffer_before_minutes: int | None = Field(default=None, ge=0, le=24 * 60)
    buffer_after_minutes: int | None = Field(default=None, ge=0, le=24 * 60)
    min_notice_minutes: int | None = Field(default=None, ge=0, le=365 * 24 * 60)
    max_advance_days: int | None = Field(default=None, ge=1, le=3650)
    slot_duration_minutes: int | None = Field(default=None, ge=5, le=24 * 60)
    slot_increment_minutes: int | None = Field(default=None, ge=5, le=24 * 60)
    all_day_events_block: bool | None = None
    metadata: dict[str, Any] | None = None


class PreviewIcsResponse(BaseModel):
    event_count: int
    busy_block_count: int
    recurrence_expansions: int
    warnings: list[str]
    duration_ms: int
    business_hours_suggested: dict[str, Any]
    date_range_note: str | None = None


class PublicAvailabilityOut(BaseModel):
    slots: list[dict[str, Any]]
    calendar_timezone: str


class HoldCreateIn(BaseModel):
    slot_start: str
    slot_end: str


class HoldCreateOut(BaseModel):
    hold_id: UUID
    expires_at: datetime
