"""Immutable published snapshot."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import UUIDPrimaryKeyMixin


class PageVersion(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "page_versions"
    __table_args__ = (
        UniqueConstraint("page_id", "version_number", name="uq_page_versions_page_ver"),
    )

    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pages.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    html: Mapped[str] = mapped_column(Text, nullable=False)
    form_schema: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    brand_kit_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    published_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )

    page = relationship("Page", back_populates="versions", foreign_keys=[page_id])
