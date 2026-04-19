from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class OrganizationOut(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    name: str
    slug: str
    plan: str
    deleted_at: datetime | None = None
    scheduled_purge_at: datetime | None = None


class OrganizationPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = Field(default=None, min_length=1, max_length=80)


class BrandKitOut(BaseModel):
    model_config = {"from_attributes": True}

    organization_id: UUID
    primary_color: str | None
    secondary_color: str | None
    logo_url: str | None
    display_font: str | None
    body_font: str | None
    voice_note: str | None


class BrandKitPut(BaseModel):
    primary_color: str | None = None
    secondary_color: str | None = None
    display_font: str | None = None
    body_font: str | None = None
    voice_note: str | None = None


class LogoUploadResponse(BaseModel):
    logo_url: str


class CreateWorkspaceBody(BaseModel):
    name: str = Field(min_length=1, max_length=120)
