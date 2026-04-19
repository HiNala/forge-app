from __future__ import annotations

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


class MeResponse(BaseModel):
    user: UserOut
    memberships: list[MembershipOut]
    active_organization_id: UUID | None
    active_role: str | None
    preferences: dict | None = None


class SwitchOrgResponse(BaseModel):
    ok: bool = True
    active_organization_id: UUID


class SignupResponse(BaseModel):
    ok: bool = True
    user_id: UUID
    organization_id: UUID


class UserPreferencesPatch(BaseModel):
    sidebar_collapsed: bool | None = None
