"""Canvas project API shapes — AL-03."""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class CanvasFlowOut(BaseModel):
    id: UUID
    from_screen_id: UUID
    to_screen_id: UUID
    trigger_label: str | None


class CanvasScreenOut(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    slug: str
    screen_type: str | None
    position_x: Decimal
    position_y: Decimal
    html: str
    component_tree: dict[str, Any] | None
    thumbnail_url: str | None
    sort_order: int


class CanvasProjectOut(BaseModel):
    id: UUID
    organization_id: UUID
    page_id: UUID | None
    kind: Literal["mobile_app", "website"]
    title: str
    intent_json: dict[str, Any]
    brand_snapshot: dict[str, Any] | None = None
    design_tokens: dict[str, Any] | None = None
    navigation_config: dict[str, Any] | None = None
    viewport_config: dict[str, Any] | None = None
    published_at: str | None = None
    created_at: str
    updated_at: str


class CanvasProjectDetail(BaseModel):
    project: CanvasProjectOut
    screens: list[CanvasScreenOut]
    flows: list[CanvasFlowOut]


class CanvasProjectCreate(BaseModel):
    kind: Literal["mobile_app", "website"]
    title: str = Field(min_length=1, max_length=500)
    prompt: str = Field(min_length=1, description="Kickoff brief — drives initial scaffold.")
    intent: dict[str, Any] | None = None


class CanvasProjectPatch(BaseModel):
    title: str | None = None
    brand_snapshot: dict[str, Any] | None = None
    design_tokens: dict[str, Any] | None = None
    navigation_config: dict[str, Any] | None = None
    viewport_config: dict[str, Any] | None = None


class CanvasScreenCreate(BaseModel):
    prompt: str = Field(min_length=1)
    position_x: Decimal | None = None
    position_y: Decimal | None = None
    screen_type: str | None = None


class CanvasScreenPatch(BaseModel):
    name: str | None = Field(default=None, max_length=500)
    html: str | None = None
    component_tree: dict[str, Any] | None = None
    position_x: Decimal | None = None
    position_y: Decimal | None = None
    sort_order: int | None = None


class CanvasFlowCreate(BaseModel):
    from_screen_id: UUID
    to_screen_id: UUID
    trigger_label: str | None = None


class CanvasRefineRequest(BaseModel):
    prompt: str = Field(min_length=1)
    scope: Literal["element", "region", "screen"] = "screen"
    element_ref: str | None = None


class CanvasRevertRequest(BaseModel):
    revision_id: UUID


class CanvasExportRequest(BaseModel):
    format: str = Field(min_length=1, description="Export format id (see EXPORT_CATALOG)")

