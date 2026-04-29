"""Admin-configurable LLM routing (V2 P-05)."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LlmRoutingPolicy(Base):
    """
    When organization_id is NULL, row is a platform default for `role`.
    When set, overrides platform for that org + role.
    """

    __tablename__ = "llm_routing_policies"
    # Uniqueness: partial indexes in Alembic (platform: org IS NULL; org: org_id+role)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organization_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    primary_provider: Mapped[str] = mapped_column(String(32), nullable=False)
    primary_model: Mapped[str] = mapped_column(Text(), nullable=False)
    fallbacks: Mapped[list[dict[str, Any]]] = mapped_column(JSONB(), nullable=False, server_default=text("'[]'::jsonb"))
    auto_route_cost_aware: Mapped[bool] = mapped_column(nullable=False, server_default=text("false"))
    cold_start_runs: Mapped[int] = mapped_column(nullable=False, server_default=text("0"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class LlmRoutingHistory(Base):
    __tablename__ = "llm_routing_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    actor_user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    organization_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
    )
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        nullable=False,
    )
