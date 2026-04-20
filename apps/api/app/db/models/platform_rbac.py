"""Platform-scoped RBAC (GL-02) — not tenant RLS tables."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PlatformPermission(Base):
    __tablename__ = "platform_permissions"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    sensitive: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")


class PlatformRole(Base):
    __tablename__ = "platform_roles"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    system: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")


class PlatformRolePermission(Base):
    """Join: which permissions each platform role grants."""

    __tablename__ = "platform_role_permissions"

    role_key: Mapped[str] = mapped_column(
        Text, ForeignKey("platform_roles.key", ondelete="CASCADE"), primary_key=True
    )
    permission_key: Mapped[str] = mapped_column(
        Text, ForeignKey("platform_permissions.key", ondelete="CASCADE"), primary_key=True
    )


class PlatformUserRole(Base):
    __tablename__ = "platform_user_roles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role_key: Mapped[str] = mapped_column(
        Text, ForeignKey("platform_roles.key", ondelete="CASCADE"), primary_key=True
    )
    granted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user = relationship("User", foreign_keys=[user_id])
    role = relationship("PlatformRole")
