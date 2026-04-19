"""Parse ISO-8601 instants from public form fields (W-01)."""

from __future__ import annotations

from datetime import datetime


def parse_iso_datetime(s: str) -> datetime:
    t = s.strip()
    if t.endswith("Z"):
        t = t[:-1] + "+00:00"
    return datetime.fromisoformat(t)
