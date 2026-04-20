"""Review observability hooks (Prometheus / logs) — optional no-op in dev."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def record_review_metrics(**kwargs: Any) -> None:
    """Record review iteration metrics when metrics backend is wired."""
    if kwargs.get("latency_ms") is not None:
        logger.debug("review_metrics %s", {k: kwargs[k] for k in sorted(kwargs) if k is not None})
