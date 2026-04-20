"""Automation rule + run API schemas (Mission 05)."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AutomationRuleOut(BaseModel):
    page_id: UUID
    organization_id: UUID
    notify_emails: list[str] = Field(default_factory=list)
    confirm_submitter: bool = True
    confirm_template_subject: str | None = None
    confirm_template_body: str | None = None
    calendar_sync_enabled: bool = False
    calendar_connection_id: UUID | None = None
    calendar_event_duration_min: int = 60
    calendar_send_invite: bool = True

    model_config = {"from_attributes": True}


class AutomationRuleUpdate(BaseModel):
    notify_emails: list[str] | None = None
    confirm_submitter: bool | None = None
    confirm_template_subject: str | None = None
    confirm_template_body: str | None = None
    calendar_sync_enabled: bool | None = None
    calendar_connection_id: UUID | None = None
    calendar_event_duration_min: int | None = Field(None, ge=15, le=24 * 60)
    calendar_send_invite: bool | None = None


class AutomationRunOut(BaseModel):
    id: UUID
    submission_id: UUID | None
    step: str
    status: str
    error_message: str | None
    result_json: dict[str, Any] | None
    ran_at: datetime

    model_config = {"from_attributes": True}


class AutomationFailureRow(BaseModel):
    """Failed run with page context for notifications UI."""

    id: UUID
    page_id: UUID
    submission_id: UUID | None
    step: str
    error_message: str | None
    ran_at: datetime

    model_config = {"from_attributes": True}


class GoogleConnectBody(BaseModel):
    """Optional page to deep-link back after OAuth."""

    page_id: UUID | None = None


class CalendarConnectionOut(BaseModel):
    id: UUID
    provider: str
    calendar_id: str
    calendar_name: str | None
    connected_at: datetime
    last_error: str | None

    model_config = {"from_attributes": True}


class SubmissionReplyBody(BaseModel):
    subject: str = Field(..., min_length=1, max_length=500)
    body: str = Field(..., min_length=1, max_length=50_000)
