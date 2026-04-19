"""API request/response models for proposals (W-02)."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ProposalOut(BaseModel):
    page_id: UUID
    organization_id: UUID
    proposal_number: str | None
    client_name: str
    client_email: str | None
    client_phone: str | None
    client_address: str | None
    project_title: str
    project_location: str | None
    executive_summary: str | None
    scope_of_work: list[Any]
    exclusions: list[Any]
    line_items: list[Any]
    subtotal_cents: int
    tax_rate_bps: int | None
    tax_cents: int
    total_cents: int
    currency: str
    timeline: list[Any]
    start_date: date | None
    estimated_completion_date: date | None
    payment_terms: str
    payment_schedule: Any | None
    warranty: str | None
    insurance: str | None
    license_info: str | None
    legal_terms: str
    expires_at: datetime | None
    status: str
    sent_at: datetime | None
    first_viewed_at: datetime | None
    decision_at: datetime | None
    decision_by_name: str | None
    decision_by_email: str | None
    decision_signature_kind: str | None
    signed_pdf_storage_key: str | None
    parent_proposal_id: UUID | None
    metadata: dict[str, Any] | None = Field(validation_alias="metadata_")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class ProposalPatch(BaseModel):
    client_name: str | None = None
    client_email: str | None = None
    client_phone: str | None = None
    client_address: str | None = None
    project_title: str | None = None
    project_location: str | None = None
    executive_summary: str | None = None
    scope_of_work: list[Any] | None = None
    exclusions: list[Any] | None = None
    line_items: list[Any] | None = None
    tax_rate_bps: int | None = Field(None, ge=0, le=50000)
    currency: str | None = None
    timeline: list[Any] | None = None
    start_date: date | None = None
    estimated_completion_date: date | None = None
    payment_terms: str | None = None
    payment_schedule: Any | None = None
    warranty: str | None = None
    insurance: str | None = None
    license_info: str | None = None
    legal_terms: str | None = None
    expires_at: datetime | None = None
    status: str | None = None
    metadata: dict[str, Any] | None = None


class ProposalPublicAccept(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    phone: str | None = None
    signature_kind: str = Field(pattern="^(drawn|typed|click_to_accept)$")
    signature_data: str | None = None  # png base64 for drawn; typed text for typed


class ProposalPublicDecline(BaseModel):
    reason: str | None = None


class ProposalQuestionIn(BaseModel):
    asker_name: str | None = None
    asker_email: str = Field(..., min_length=3)
    section_ref: str | None = None
    question: str = Field(..., min_length=1, max_length=8000)


class ProposalTemplateOut(BaseModel):
    id: UUID
    organization_id: UUID | None
    name: str
    description: str | None
    industry: str | None
    is_system: bool
    scope_blueprint: list[Any]
    line_items_blueprint: list[Any] | None
    terms_template: str | None
    use_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ProposalTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    scope_blueprint: list[Any]
    line_items_blueprint: list[Any] | None = None
    terms_template: str | None = None
