"""Export / handoff API (P-07)."""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ExportFormatItemOut(BaseModel):
    id: str
    label: str
    description: str
    plan_minimum: str
    implemented: bool
    async_worker: bool
    locked: bool
    whats_inside: list[str] = Field(default_factory=list)
    status: str


class ExportFormatsOut(BaseModel):
    formats: list[ExportFormatItemOut]


class ExportRunIn(BaseModel):
    format: str = Field(..., min_length=2, max_length=64)
    options: dict[str, Any] = Field(default_factory=dict)


class ExportRunQueuedOut(BaseModel):
    result: Literal["queued", "json", "html", "text", "error"]
    data: Any = None
    message: str | None = None
