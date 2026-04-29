"""Canvas project storage — AL-03."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import UUIDPrimaryKeyMixin


class CanvasProject(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "canvas_projects"
    __table_args__ = (
        CheckConstraint("kind IN ('mobile_app','website')", name="canvas_projects_kind_check"),
    )

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
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    intent_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default="{}")
    brand_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    design_tokens: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    navigation_config: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    viewport_config: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    organization = relationship("Organization")
    page = relationship("Page")


class CanvasScreen(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "canvas_screens"
    __table_args__ = (UniqueConstraint("project_id", "slug", name="uq_canvas_screens_project_slug"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("canvas_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    screen_type: Mapped[str | None] = mapped_column(Text)
    position_x: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, server_default="0")
    position_y: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, server_default="0")
    html: Mapped[str] = mapped_column(Text, nullable=False)
    component_tree: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    thumbnail_url: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    project = relationship("CanvasProject")
    revisions = relationship("CanvasScreenRevision", back_populates="screen", cascade="all, delete-orphan")


class CanvasFlow(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "canvas_flows"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("canvas_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_screen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("canvas_screens.id", ondelete="CASCADE"),
        nullable=False,
    )
    to_screen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("canvas_screens.id", ondelete="CASCADE"),
        nullable=False,
    )
    trigger_label: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    project = relationship("CanvasProject")


class CanvasScreenRevision(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "canvas_screen_revisions"
    __table_args__ = (
        UniqueConstraint("screen_id", "version_number", name="uq_canvas_revisions_screen_version"),
        CheckConstraint(
            "edit_type IN ('initial','full_refine','region_edit','manual_edit','revert')",
            name="canvas_screen_revisions_edit_type_check",
        ),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    screen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("canvas_screens.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    html: Mapped[str] = mapped_column(Text, nullable=False)
    component_tree: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    edit_type: Mapped[str] = mapped_column(String(24), nullable=False)
    region_scope: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    tokens_input: Mapped[int | None] = mapped_column(Integer)
    tokens_output: Mapped[int | None] = mapped_column(Integer)
    cost_cents: Mapped[int | None] = mapped_column(Integer)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    screen = relationship("CanvasScreen", back_populates="revisions")
