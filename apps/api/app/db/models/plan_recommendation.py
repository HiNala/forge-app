"""BP-04 — plan tier suggestions (nightly worker creates rows)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import UUIDPrimaryKeyMixin


class PlanRecommendation(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "plan_recommendations"

    organization_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    current_plan: Mapped[str] = mapped_column(String(64), nullable=False)
    recommended_plan: Mapped[str] = mapped_column(String(64), nullable=False)
    savings_cents: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    currency: Mapped[str] = mapped_column(String(12), nullable=False, server_default="usd")
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    acted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
