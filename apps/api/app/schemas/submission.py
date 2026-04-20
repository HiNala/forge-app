"""Submission schemas — public POST /p/.../submit and admin surfaces."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class PublicSubmitOut(BaseModel):
    """Response to a successful public form POST."""

    ok: bool = True


class PublicUploadIn(BaseModel):
    """Request presigned PUT for a declared file field on a live page."""

    field_name: str = Field(..., min_length=1, max_length=200)
    file_name: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(..., min_length=3, max_length=200)
    size_bytes: int = Field(..., ge=1, le=52_428_800)


class PublicUploadOut(BaseModel):
    upload_url: str
    storage_key: str
    expires_in: int = 3600


class PresignedFileDownloadOut(BaseModel):
    """Short-lived GET URL for an attached file (admin only)."""

    url: str
    expires_in: int = 900


class SubmissionBulkBody(BaseModel):
    submission_ids: list[UUID] = Field(..., min_length=1, max_length=500)
    action: Literal["mark_read", "archive"]


class SubmissionOut(BaseModel):
    """Tenant-scoped submission row for Studio / admin tables."""

    id: UUID
    organization_id: UUID
    page_id: UUID
    page_version_id: UUID | None
    payload: dict[str, Any]
    submitter_email: str | None
    submitter_name: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SubmissionPatchBody(BaseModel):
    """Admin update to a submission row."""

    status: str | None = Field(
        None,
        description="new | read | replied | archived",
    )


class DraftReplyOut(BaseModel):
    subject: str
    body: str


class SubmissionListOut(BaseModel):
    """Cursor-paged list (Mission 04 admin)."""

    items: list[SubmissionOut] = Field(default_factory=list)
    next_before: datetime | None = Field(
        None,
        description="If set, pass as `before` to fetch the next page.",
    )
