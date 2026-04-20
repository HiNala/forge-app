"""Pitch deck orchestration (W-03).

Import :mod:`app.services.orchestration.deck.composer` separately to avoid circular imports
(``deck_builder`` → ``deck.frameworks`` loads this package; do not pull composer in here).
"""

from app.services.orchestration.deck.frameworks import (
    DEFAULT_FRAMEWORK_KEY,
    FRAMEWORKS,
    resolve_framework_key,
)

__all__ = ["DEFAULT_FRAMEWORK_KEY", "FRAMEWORKS", "resolve_framework_key"]
