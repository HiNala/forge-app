"""Page — generated site unit."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import UUIDPrimaryKeyMixin


class Page(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "pages"
    __table_args__ = (UniqueConstraint("organization_id", "slug", name="uq_pages_org_slug"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    page_type: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default="draft"
    )  # draft | live | archived
    current_html: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    form_schema: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    brand_kit_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    intent_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    published_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("page_versions.id", use_alter=True, name="fk_pages_published_version_id"),
    )
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    organization = relationship("Organization")
    created_by = relationship("User")
    versions = relationship(
        "PageVersion",
        back_populates="page",
        foreign_keys="PageVersion.page_id",
    )
    published_version = relationship(
        "PageVersion",
        foreign_keys="Page.published_version_id",
        post_update=True,
    )
    proposal = relationship(
        "Proposal",
        back_populates="page",
        uselist=False,
        passive_deletes=True,
    )
    deck = relationship(
        "Deck",
        back_populates="page",
        uselist=False,
        passive_deletes=True,
    )
