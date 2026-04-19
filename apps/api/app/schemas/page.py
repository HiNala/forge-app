from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PageOut(BaseModel):
    id: UUID
    organization_id: UUID
    slug: str
    page_type: str
    title: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PageDetailOut(PageOut):
    """Single-page fetch — includes generated HTML for Studio / preview."""

    current_html: str

    model_config = {"from_attributes": True}


class PageCreate(BaseModel):
    slug: str
    page_type: str = "landing"
    title: str = "Untitled"


class PagePatch(BaseModel):
    title: str | None = None
    slug: str | None = None
    status: str | None = None


class PublishOut(BaseModel):
    ok: bool = True
    page_id: UUID
    status: str
    published_version_id: UUID
    public_url: str


class PageVersionOut(BaseModel):
    id: UUID
    version_number: int
    published_at: datetime

    model_config = {"from_attributes": True}


class PublicPageOut(BaseModel):
    """Unauthenticated read for Next.js public renderer."""

    html: str
    title: str
    slug: str
    organization_slug: str
