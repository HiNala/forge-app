"""User-configured calendar used for appointment availability (W-01)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import UUIDPrimaryKeyMixin


class AvailabilityCalendar(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "availability_calendars"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[str] = mapped_column(Text, nullable=False)
    source_ref: Mapped[str | None] = mapped_column(Text)
    timezone: Mapped[str] = mapped_column(Text, nullable=False, server_default="UTC")
    business_hours: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    buffer_before_minutes: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    buffer_after_minutes: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    min_notice_minutes: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1440")
    max_advance_days: Mapped[int] = mapped_column(Integer, nullable=False, server_default="60")
    slot_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, server_default="30")
    slot_increment_minutes: Mapped[int] = mapped_column(Integer, nullable=False, server_default="15")
    all_day_events_block: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSONB)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_sync_summary: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    busy_blocks = relationship("CalendarBusyBlock", back_populates="calendar", cascade="all, delete-orphan")
