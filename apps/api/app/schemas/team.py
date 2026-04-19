from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class InviteBody(BaseModel):
    email: EmailStr
    role: str = Field(pattern="^(owner|editor|viewer)$")


class MemberOut(BaseModel):
    id: UUID
    user_id: UUID
    email: str
    display_name: str | None
    role: str
    created_at: datetime


class InviteResponse(BaseModel):
    ok: bool = True
    invitation_id: UUID


class AcceptInviteResponse(BaseModel):
    ok: bool = True
    organization_id: UUID


class PatchMemberBody(BaseModel):
    role: str = Field(pattern="^(owner|editor|viewer)$")
