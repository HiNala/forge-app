"""Public beacon — POST /p/{org}/{page}/track."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class TrackEventIn(BaseModel):
    event_type: str = Field(min_length=1, max_length=64)
    visitor_id: str = Field(min_length=1, max_length=128)
    session_id: str = Field(min_length=1, max_length=128)
    metadata: dict[str, Any] | None = None


class TrackBatchIn(BaseModel):
    events: list[TrackEventIn] = Field(min_length=1, max_length=10)


class TrackBatchOut(BaseModel):
    ok: bool = True
    accepted: int
