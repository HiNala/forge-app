"""Automation wiring per page (one row per page)."""

import uuid
from datetime import datetime

from sqlalchemy import (
    ARRAY,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import UUIDPrimaryKeyMixin


class AutomationRule(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "automation_rules"
    __table_args__ = (UniqueConstraint("page_id", name="uq_automation_rules_page"),)

    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pages.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )
    notify_emails: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    confirm_submitter: Mapped[bool] = mapped_column(Boolean, server_default="true")
    confirm_template_subject: Mapped[str | None] = mapped_column(Text)
    confirm_template_body: Mapped[str | None] = mapped_column(Text)
    calendar_sync_enabled: Mapped[bool] = mapped_column(Boolean, server_default="false")
    calendar_connection_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("calendar_connections.id")
    )
    calendar_event_duration_min: Mapped[int] = mapped_column(Integer, server_default="60")
    calendar_send_invite: Mapped[bool] = mapped_column(Boolean, server_default="true")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    page = relationship("Page")
    calendar_connection = relationship("CalendarConnection")
