"""Submission schemas — public POST /p/.../submit and admin surfaces."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class PublicSubmitOut(BaseModel):
    """Response to a successful public form POST."""

    ok: bool = True


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


class SubmissionListOut(BaseModel):
    """Cursor-paged list (Mission 04 admin)."""

    items: list[SubmissionOut] = Field(default_factory=list)
    next_before: datetime | None = Field(
        None,
        description="If set, pass as `before` to fetch the next page.",
    )
