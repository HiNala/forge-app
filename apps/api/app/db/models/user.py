"""User — global identity (no organization_id)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Text, func
from sqlalchemy.dialects.postgresql import CITEXT, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import UUIDPrimaryKeyMixin


class User(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(CITEXT, unique=True, nullable=False, index=True)
    display_name: Mapped[str | None] = mapped_column(Text)
    avatar_url: Mapped[str | None] = mapped_column(Text)
    auth_provider_id: Mapped[str | None] = mapped_column(Text, index=True)
    password_hash: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pending_email: Mapped[str | None] = mapped_column(Text)
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    # GL-02 — last time user opened admin UI (pulse "since last visit")
    platform_last_visit_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user_preferences: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    memberships = relationship("Membership", back_populates="user")
    oauth_identities = relationship("OAuthIdentity", back_populates="user")
    auth_sessions = relationship("AuthSession", back_populates="user")
    invitations_sent = relationship(
        "Invitation",
        foreign_keys="Invitation.invited_by_user_id",
        back_populates="invited_by",
    )
