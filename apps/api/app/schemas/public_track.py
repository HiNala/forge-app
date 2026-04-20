"""Public beacon — POST /p/{org}/{page}/track."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class TrackEventIn(BaseModel):
    event_type: str = Field(min_length=1, max_length=200)
    visitor_id: str = Field(min_length=1, max_length=500)
    session_id: str = Field(min_length=1, max_length=500)
    metadata: dict[str, Any] | None = None
    client_event_id: str | None = Field(default=None, max_length=200)


class TrackBatchIn(BaseModel):
    events: list[TrackEventIn] = Field(min_length=1, max_length=20)


class TrackBatchOut(BaseModel):
    ok: bool = True
    accepted: int
