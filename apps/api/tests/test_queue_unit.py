"""Background enqueue helpers — no DB."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.queue import enqueue_run_automations


@pytest.mark.asyncio
async def test_enqueue_run_automations_noops_when_arq_pool_missing() -> None:
    """If Redis/arq failed at startup, submit still succeeds; enqueue is skipped."""
    state = MagicMock()
    state.arq_pool = None
    await enqueue_run_automations(state, "sub-id")


@pytest.mark.asyncio
async def test_enqueue_run_automations_delegates_to_pool() -> None:
    pool = MagicMock()
    pool.enqueue_job = AsyncMock()
    state = MagicMock()
    state.arq_pool = pool
    await enqueue_run_automations(state, "abc-123")
    pool.enqueue_job.assert_called_once_with("run_automations", "abc-123")
