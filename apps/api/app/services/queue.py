"""Background job enqueue (arq). Mission 05 fills in real automation bodies."""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

logger = logging.getLogger(__name__)


async def enqueue_template_preview(app_state: Any, template_id: str) -> None:
    """Regenerate template preview image (Playwright in worker)."""
    pool = getattr(app_state, "arq_pool", None)
    if pool is None:
        return
    try:
        await pool.enqueue_job("generate_template_preview", template_id)
    except Exception as e:
        logger.warning("enqueue_template_preview failed: %s", e)


async def enqueue_run_automations(app_state: Any, submission_id: str) -> None:
    """Fire-and-forget automation pipeline for a new submission (stub worker until Mission 05)."""
    pool = getattr(app_state, "arq_pool", None)
    if pool is None:
        return
    try:
        await pool.enqueue_job("run_automations", submission_id)
    except Exception as e:
        logger.warning("enqueue_run_automations failed: %s", e)


async def enqueue_deck_export(app_state: Any, page_id: str, export_format: str) -> bool:
    """PPTX/PDF export for pitch decks (W-03). Returns false when queueing did not happen."""
    pool = getattr(app_state, "arq_pool", None)
    if pool is None:
        logger.warning("enqueue_deck_export: arq pool missing, job not scheduled")
        return False
    try:
        await pool.enqueue_job("deck_export", page_id, export_format)
        return True
    except Exception as e:
        logger.warning("enqueue_deck_export failed: %s", e)
        return False


async def enqueue_proposal_pdf(app_state: Any, page_id: str) -> None:
    """Render signed proposal PDF in worker (Playwright) — W-02."""
    pool = getattr(app_state, "arq_pool", None)
    if pool is None:
        return
    try:
        await pool.enqueue_job("proposal_pdf_render", page_id)
    except Exception as e:
        logger.warning("enqueue_proposal_pdf failed: %s", e)


async def enqueue_purge_deleted_user(app_state: Any, user_id: str) -> None:
    """Schedule PII scrub 30 days after account deletion (BI-03)."""
    pool = getattr(app_state, "arq_pool", None)
    if pool is None:
        logger.warning("enqueue_purge_deleted_user: arq pool missing, job not scheduled")
        return
    try:
        await pool.enqueue_job(
            "purge_deleted_user",
            user_id,
            _job_id=f"purge_user_{user_id}",
            _defer_by=timedelta(days=30),
        )
    except Exception as e:
        logger.warning("enqueue_purge_deleted_user failed: %s", e)
