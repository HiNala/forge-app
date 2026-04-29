from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class RegisterBody(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=12, max_length=1024)
    display_name: str | None = Field(default=None, max_length=200)
    workspace_name: str = Field(default="My workspace", min_length=1, max_length=120)


class LoginBody(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=1024)


class RefreshBody(BaseModel):
    refresh_token: str = Field(min_length=32, max_length=512)


class LogoutBody(BaseModel):
    refresh_token: str | None = Field(default=None, min_length=32, max_length=512)


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: str
    user: UserOut
    organization_id: UUID | None = None


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
    email_verified: bool = False
    is_platform_admin: bool = False


class VerifyEmailBody(BaseModel):
    token: str = Field(min_length=32, max_length=512)


class VerifyEmailResponse(BaseModel):
    ok: bool = True
    user_id: UUID


class ResendVerificationResponse(BaseModel):
    ok: bool = True
    sent: bool
    already_verified: bool = False


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
