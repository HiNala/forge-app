from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class SignupBody(BaseModel):
    workspace_name: str = Field(min_length=1, max_length=120)


class SwitchOrgBody(BaseModel):
    organization_id: UUID


class MembershipOut(BaseModel):
    organization_id: UUID
    organization_name: str
    organization_slug: str
    role: str


class UserOut(BaseModel):
    id: UUID
    email: str
    display_name: str | None
    avatar_url: str | None


class UserMePatch(BaseModel):
    """Profile fields saved from Settings; timezone/locale live in `preferences` JSONB."""

    display_name: str | None = Field(default=None, max_length=200)
    avatar_url: str | None = Field(default=None, max_length=2048)
    timezone: str | None = Field(default=None, max_length=64)
    locale: str | None = Field(default=None, max_length=32)


class MeResponse(BaseModel):
    user: UserOut
    memberships: list[MembershipOut]
    active_organization_id: UUID | None
    active_role: str | None
    preferences: dict[str, Any] | None = None


class SwitchOrgResponse(BaseModel):
    ok: bool = True
    active_organization_id: UUID


class SignupResponse(BaseModel):
    ok: bool = True
    user_id: UUID
    organization_id: UUID


class DeleteMeResponse(BaseModel):
    ok: bool = True
    purge_job_scheduled: bool = True
