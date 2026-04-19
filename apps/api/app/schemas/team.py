from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator


class InviteBody(BaseModel):
    """Single ``email`` or comma-separated ``emails``."""

    email: EmailStr | None = None
    emails: str | None = Field(None, description="Comma-separated list")
    role: str = Field(pattern="^(owner|editor|viewer)$")

    @model_validator(mode="after")
    def _need_address(self) -> InviteBody:
        if (self.emails and self.emails.strip()) or self.email:
            return self
        raise ValueError("Provide email or emails")

    def parsed_emails(self) -> list[str]:
        if self.emails and self.emails.strip():
            return [p.strip().lower() for p in self.emails.split(",") if p.strip()]
        assert self.email is not None
        return [str(self.email).lower()]


class MemberOut(BaseModel):
    id: UUID
    user_id: UUID
    email: str
    display_name: str | None
    role: str
    created_at: datetime


class InviteResponse(BaseModel):
    ok: bool = True
    invitation_ids: list[UUID]


class InvitationPendingOut(BaseModel):
    id: UUID
    email: str
    role: str
    expires_at: datetime
    created_at: datetime
    invited_by_email: str | None = None


class TransferOwnershipBody(BaseModel):
    target_membership_id: UUID


class AcceptInviteResponse(BaseModel):
    ok: bool = True
    organization_id: UUID


class PatchMemberBody(BaseModel):
    role: str = Field(pattern="^(owner|editor|viewer)$")
