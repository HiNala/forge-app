"""Background job enqueue (arq). Mission 05 fills in real automation bodies."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


async def enqueue_run_automations(app_state: Any, submission_id: str) -> None:
    """Fire-and-forget automation pipeline for a new submission (stub worker until Mission 05)."""
    pool = getattr(app_state, "arq_pool", None)
    if pool is None:
        return
    try:
        await pool.enqueue_job("run_automations", submission_id)
    except Exception as e:
        logger.warning("enqueue_run_automations failed: %s", e)
