"""Background enqueue helpers — no DB."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.queue import enqueue_purge_deleted_user, enqueue_run_automations


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
    pool.enqueue_job.assert_called_once()
    call = pool.enqueue_job.call_args
    assert call[0][0] == "run_automations"
    assert call[0][1] == "abc-123"
    assert call[1].get("_job_id") == "forge:auto:sub:abc-123"


@pytest.mark.asyncio
async def test_enqueue_purge_deleted_user_uses_deferred_job() -> None:
    pool = MagicMock()
    pool.enqueue_job = AsyncMock()
    state = MagicMock()
    state.arq_pool = pool
    await enqueue_purge_deleted_user(state, "550e8400-e29b-41d4-a716-446655440000")
    pool.enqueue_job.assert_called_once()
    call = pool.enqueue_job.call_args
    assert call[0][0] == "purge_deleted_user"
    assert call[0][1] == "550e8400-e29b-41d4-a716-446655440000"
    assert call[1].get("_job_id") == "purge_user_550e8400-e29b-41d4-a716-446655440000"
    assert call[1].get("_defer_by").days == 30
