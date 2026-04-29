"""Lightweight directed async graph (~O-02) — sequential + parallel fan-out helpers."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from typing import ParamSpec, TypeVar

from app.services.orchestration.product_brain.schemas import OrchestratorState

P = ParamSpec("P")
R = TypeVar("R")


class GraphTermination(Exception):
    def __init__(self, reason: str) -> None:
        self.reason = reason
        super().__init__(reason)


async def guarded_call(
    name: str,
    fn: Callable[[OrchestratorState], Awaitable[None]],
    state: OrchestratorState,
    *,
    budget_check: Callable[[OrchestratorState], bool],
) -> None:
    """Run a named node unless budget forbids."""
    if not budget_check(state):
        raise GraphTermination(state.terminated_reason or "budget_guard")
    await fn(state)


async def parallel_all(
    *,
    runners: tuple[tuple[str, Callable[[OrchestratorState], Awaitable[None]]], ...],
    state: OrchestratorState,
) -> None:
    """Bounded fan-out: run unrelated agents concurrently."""

    async def wrap(k: str, f: Callable[[OrchestratorState], Awaitable[None]]) -> None:
        await f(state)

    await asyncio.gather(*(wrap(k, f) for k, f in runners))
