"""Contractor proposal (W-02) — 1:1 with Page when page_type is proposal."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    SmallInteger,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import CITEXT, INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Proposal(Base):
    __tablename__ = "proposals"

    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pages.id", ondelete="CASCADE"), primary_key=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    proposal_number: Mapped[str | None] = mapped_column(Text)
    client_name: Mapped[str] = mapped_column(Text, nullable=False)
    client_email: Mapped[str | None] = mapped_column(CITEXT)
    client_phone: Mapped[str | None] = mapped_column(Text)
    client_address: Mapped[str | None] = mapped_column(Text)
    project_title: Mapped[str] = mapped_column(Text, nullable=False)
    project_location: Mapped[str | None] = mapped_column(Text)
    executive_summary: Mapped[str | None] = mapped_column(Text)
    scope_of_work: Mapped[list[Any]] = mapped_column(JSONB, nullable=False)
    exclusions: Mapped[list[Any]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    line_items: Mapped[list[Any]] = mapped_column(JSONB, nullable=False)
    subtotal_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    tax_rate_bps: Mapped[int | None] = mapped_column(Integer)
    tax_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    total_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(Text, nullable=False, server_default="USD")
    timeline: Mapped[list[Any]] = mapped_column(JSONB, nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date)
    estimated_completion_date: Mapped[date | None] = mapped_column(Date)
    payment_terms: Mapped[str] = mapped_column(Text, nullable=False)
    payment_schedule: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(JSONB)
    warranty: Mapped[str | None] = mapped_column(Text)
    insurance: Mapped[str | None] = mapped_column(Text)
    license_info: Mapped[str | None] = mapped_column(Text)
    legal_terms: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="draft", index=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    first_viewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decision_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decision_by_name: Mapped[str | None] = mapped_column(Text)
    decision_by_email: Mapped[str | None] = mapped_column(CITEXT)
    decision_ip: Mapped[str | None] = mapped_column(INET)
    decision_user_agent: Mapped[str | None] = mapped_column(Text)
    decision_signature_data: Mapped[str | None] = mapped_column(Text)
    decision_signature_kind: Mapped[str | None] = mapped_column(Text)
    signed_pdf_storage_key: Mapped[str | None] = mapped_column(Text)
    parent_proposal_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("proposals.page_id", ondelete="SET NULL")
    )
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    page = relationship("Page", back_populates="proposal", foreign_keys=[page_id])


class ProposalQuestion(Base):
    __tablename__ = "proposal_questions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pages.id", ondelete="CASCADE"), nullable=False
    )
    asker_name: Mapped[str | None] = mapped_column(Text)
    asker_email: Mapped[str] = mapped_column(CITEXT, nullable=False)
    section_ref: Mapped[str | None] = mapped_column(Text)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str | None] = mapped_column(Text)
    answered_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    asker_ip: Mapped[str | None] = mapped_column(INET)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProposalTemplate(Base):
    __tablename__ = "proposal_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    industry: Mapped[str | None] = mapped_column(Text)
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    scope_blueprint: Mapped[list[Any]] = mapped_column(JSONB, nullable=False)
    line_items_blueprint: Mapped[list[Any] | None] = mapped_column(JSONB)
    terms_template: Mapped[str | None] = mapped_column(Text)
    use_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProposalSequence(Base):
    __tablename__ = "proposal_sequences"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True
    )
    year: Mapped[int] = mapped_column(SmallInteger(), primary_key=True)
    next_seq: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")


class OrgTestimonial(Base):
    __tablename__ = "org_testimonials"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quote: Mapped[str] = mapped_column(Text, nullable=False)
    attribution: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
