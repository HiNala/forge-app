"""Per-org email template overrides (BI-04)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class EmailTemplateOverride(Base):
    __tablename__ = "email_templates_overrides"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True
    )
    notify_owner_subject: Mapped[str | None] = mapped_column(Text)
    notify_owner_body: Mapped[str | None] = mapped_column(Text)
    confirm_submitter_subject: Mapped[str | None] = mapped_column(Text)
    confirm_submitter_body: Mapped[str | None] = mapped_column(Text)
    reply_signature: Mapped[str | None] = mapped_column(Text)
    from_name: Mapped[str | None] = mapped_column(Text)
    reply_to_override: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
