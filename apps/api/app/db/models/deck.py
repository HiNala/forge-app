"""Pitch deck (W-03) — 1:1 with Page when page_type is pitch_deck."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Deck(Base):
    __tablename__ = "decks"

    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pages.id", ondelete="CASCADE"),
        primary_key=True,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    deck_kind: Mapped[str] = mapped_column(Text, nullable=False)
    narrative_framework: Mapped[str | None] = mapped_column(Text)
    target_audience: Mapped[str | None] = mapped_column(Text)
    slide_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="10")
    slides: Mapped[list[Any]] = mapped_column(JSONB, nullable=False)
    theme: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    speaker_notes: Mapped[dict[str, Any] | None] = mapped_column(JSONB, server_default="{}")
    transitions: Mapped[str | None] = mapped_column(Text, server_default="fade")
    locked_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_exported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_exported_format: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    page = relationship("Page", back_populates="deck", foreign_keys=[page_id])
