"""Organization (tenant)."""

from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import UUIDPrimaryKeyMixin


class Organization(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "organizations"

    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    plan: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="trial"
    )  # trial | starter | pro | enterprise
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    stripe_customer_id: Mapped[str | None] = mapped_column(Text, index=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    scheduled_purge_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    payment_failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    stripe_subscription_status: Mapped[str | None] = mapped_column(Text)
    org_settings: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    account_status: Mapped[str] = mapped_column(Text, nullable=False, server_default="active")
    # V2 P-04 — rolling Forge Credit windows (denormalized; ledger is source of truth)
    credits_consumed_session: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default="0"
    )
    credits_consumed_week: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default="0")
    session_window_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    week_window_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    extra_usage_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    extra_usage_monthly_cap_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    extra_usage_spent_period_cents: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )

    memberships = relationship("Membership", back_populates="organization")
    brand_kit = relationship("BrandKit", back_populates="organization", uselist=False)
