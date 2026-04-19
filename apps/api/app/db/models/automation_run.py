"""Automation pipeline step observability."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import UUIDPrimaryKeyMixin


class AutomationRun(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "automation_runs"

    automation_rule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("automation_rules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )
    submission_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    step: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text)
    attempt: Mapped[int] = mapped_column(Integer, server_default="1")
    result_json: Mapped[dict | None] = mapped_column(JSONB)
    ran_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
