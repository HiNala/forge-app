"""Feature flag defaults; org overrides win (BI-04)."""

from __future__ import annotations

DEFAULT_FLAGS: dict[str, bool] = {
    "pitch_deck_workflow": False,
    "calendar_v2": False,
}
