"""Template library (Mission 09)."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class TemplateListItemOut(BaseModel):
    id: UUID
    slug: str
    name: str
    description: str | None
    category: str
    preview_image_url: str | None
    sort_order: int

    model_config = {"from_attributes": True}


class TemplateDetailOut(BaseModel):
    id: UUID
    slug: str
    name: str
    description: str | None
    category: str
    preview_image_url: str | None
    html: str
    form_schema: dict[str, Any] | None
    intent_json: dict[str, Any] | None
    sort_order: int
    updated_at: datetime

    model_config = {"from_attributes": True}


class UseTemplateOut(BaseModel):
    page_id: UUID
    studio_path: str = Field(
        ...,
        description="Relative app path to open Studio with the new page.",
    )


class AdminTemplateCreate(BaseModel):
    slug: str = Field(..., min_length=2, max_length=120)
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    category: str = Field(..., min_length=1, max_length=32)
    html: str = Field(..., min_length=1)
    form_schema: dict[str, Any] | None = None
    intent_json: dict[str, Any] | None = None
    is_published: bool = False
    sort_order: int = 0


class AdminTemplatePatch(BaseModel):
    slug: str | None = Field(None, min_length=2, max_length=120)
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    category: str | None = Field(None, min_length=1, max_length=32)
    html: str | None = Field(None, min_length=1)
    form_schema: dict[str, Any] | None = None
    intent_json: dict[str, Any] | None = None
    is_published: bool | None = None
    sort_order: int | None = None


class AdminTemplateOut(BaseModel):
    id: UUID
    slug: str
    name: str
    description: str | None
    category: str
    preview_image_url: str | None
    is_published: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TemplateFromPageIn(BaseModel):
    page_id: UUID


class PublicTemplateOut(BaseModel):
    """Marketing /examples/{slug} — published templates only."""

    id: UUID
    slug: str
    name: str
    description: str | None
    category: str
    preview_image_url: str | None
    html: str


class TemplateSlugListOut(BaseModel):
    slugs: list[str]


class TemplateStatsRow(BaseModel):
    template_id: UUID
    template_name: str
    use_count: int


class TemplateStatsOut(BaseModel):
    top_templates: list[TemplateStatsRow]
