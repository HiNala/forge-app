"""O-01 — time-bounded gather."""

from __future__ import annotations

import asyncio

import pytest

from app.services.context.budget import wait_with_budget


@pytest.mark.asyncio
async def test_wait_with_budget_cancels_slow_tasks() -> None:
    async def fast() -> str:
        await asyncio.sleep(0.01)
        return "ok"

    async def slow() -> str:
        await asyncio.sleep(10)
        return "no"

    tasks = {
        "a": asyncio.create_task(fast()),
        "b": asyncio.create_task(slow()),
    }
    out = await wait_with_budget(tasks, budget_seconds=0.15)
    assert out["a"] == "ok"
    assert out["b"] is None
