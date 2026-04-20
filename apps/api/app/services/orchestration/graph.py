"""Directed graph runtime — Mission O-02 (small bespoke LangGraph-style runner)."""

from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import TypeVar

from app.services.orchestration.graph_state import GraphState

S = TypeVar("S", bound=GraphState)


@dataclass
class GraphNode:
    name: str
    run: Callable[[S], Awaitable[S]]


@dataclass
class GraphEdge:
    from_node: str
    to_node: str
    condition: Callable[[S], bool] | None = None


class Graph:
    """Explicit graph with conditional edges and a terminal node."""

    def __init__(
        self,
        nodes: dict[str, GraphNode],
        edges: list[GraphEdge],
        *,
        entry: str,
        terminal: str,
    ) -> None:
        self.nodes = nodes
        self.edges = edges
        self.entry = entry
        self.terminal = terminal

    def _outgoing(self, name: str) -> list[GraphEdge]:
        return [e for e in self.edges if e.from_node == name]

    async def run(self, initial_state: S) -> S:
        current = self.entry
        state: S = initial_state
        visited = 0
        max_steps = 64
        while current != self.terminal:
            visited += 1
            if visited > max_steps:
                state.errors.append("graph: max steps exceeded")
                state.status = "failed"
                break
            node = self.nodes.get(current)
            if node is None:
                state.errors.append(f"graph: missing node {current}")
                state.status = "failed"
                break
            t0 = time.perf_counter()
            try:
                state = await node.run(state)
            except Exception as e:
                state.errors.append(f"{current}: {e}")
                state.status = "failed"
                current = self.terminal
                break
            dt_ms = int((time.perf_counter() - t0) * 1000)
            state.node_timings_ms[node.name] = state.node_timings_ms.get(node.name, 0) + dt_ms
            outs = self._outgoing(current)
            nxt: str | None = None
            for e in outs:
                if e.condition is None or e.condition(state):
                    nxt = e.to_node
                    break
            if nxt is None:
                state.errors.append(f"graph: no edge from {current}")
                state.status = "failed"
                break
            current = nxt
            await asyncio.sleep(0)
        if state.status == "running":
            state.status = "completed"
        return state
