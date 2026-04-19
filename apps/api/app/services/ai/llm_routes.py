"""Logical LLM routes (Mission 03).

Runtime selection is implemented in :mod:`app.services.ai.router` via LiteLLM and
``settings.LLM_MODEL_*`` / ``LLM_DEFAULT_PROVIDER``. This table documents the
intended mapping; keep it aligned with config and ``_PROVIDER_DEFAULTS`` in the router.
"""

from __future__ import annotations

from typing import Any

# Mirrors mission spec — env vars override model ids per task.
LLM_ROUTES: dict[str, dict[str, Any]] = {
    "intent": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.0},
    "compose": {"provider": "openai", "model": "gpt-4o", "temperature": 0.3},
    "section_edit": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.2},
}
