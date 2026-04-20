"""Orchestration run traces — Mission O-02."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import UUIDPrimaryKeyMixin


class OrchestrationRun(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "orchestration_runs"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    page_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pages.id", ondelete="SET NULL"),
        nullable=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    graph_name: Mapped[str] = mapped_column(Text, nullable=False)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    intent: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    plan: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    review_findings: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    node_timings: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    total_tokens_input: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    total_tokens_output: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    total_cost_cents: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    total_duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
    )  # completed | degraded | aborted | failed
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    organization = relationship("Organization")
    page = relationship("Page")
    user = relationship("User")
