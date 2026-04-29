"""Orchestration run persistence — clarify TTL + final trace merge (AL-03)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.db.models import OrchestrationRun
from app.services.orchestration.orchestration_recorder import record_run, upsert_clarify_pending


@pytest.mark.asyncio
async def test_upsert_clarify_inserts_pending_row() -> None:
    db = MagicMock()
    db.get = AsyncMock(return_value=None)
    db.flush = AsyncMock()
    rid = uuid4()
    org = uuid4()
    exp = await upsert_clarify_pending(
        db,
        run_id=rid,
        organization_id=org,
        user_id=None,
        intent={"workflow": "landing"},
        graph_state={"phase": "clarify_pending"},
    )
    assert exp.tzinfo is not None
    db.add.assert_called_once()
    db.flush.assert_called_once()


@pytest.mark.asyncio
async def test_record_run_clears_clarify_expiry_on_merge() -> None:
    db = MagicMock()
    row = MagicMock(spec=OrchestrationRun)
    sentinel = object()
    row.clarify_expires_at = sentinel
    db.get = AsyncMock(return_value=row)
    await record_run(
        db,
        run_id=uuid4(),
        organization_id=uuid4(),
        user_id=None,
        page_id=None,
        graph_name="generate",
        prompt="hello",
        intent={"workflow": "landing"},
        plan=None,
        node_timings={},
        status="completed",
        total_duration_ms=12,
    )
    assert row.clarify_expires_at is None
