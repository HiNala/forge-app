"""Monthly AI / quota usage per organization."""

import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import UUIDPrimaryKeyMixin


class SubscriptionUsage(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "subscription_usage"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "period_start",
            name="uq_subscription_usage_org_period",
        ),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    pages_generated: Mapped[int] = mapped_column(Integer, server_default="0")
    section_edits: Mapped[int] = mapped_column(Integer, server_default="0")
    tokens_prompt: Mapped[int] = mapped_column(BigInteger, server_default="0")
    tokens_completion: Mapped[int] = mapped_column(BigInteger, server_default="0")
    cost_cents: Mapped[int] = mapped_column(Integer, server_default="0")
    submissions_received: Mapped[int] = mapped_column(Integer, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
