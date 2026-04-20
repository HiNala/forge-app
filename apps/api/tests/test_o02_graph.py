"""Mission O-02 — graph runtime."""

from uuid import uuid4

import pytest

from app.services.orchestration.graph import Graph, GraphEdge, GraphNode
from app.services.orchestration.graph_state import GraphState


async def _a(state: GraphState) -> GraphState:
    state.node_timings_ms["a"] = 1
    return state


async def _b(state: GraphState) -> GraphState:
    state.node_timings_ms["b"] = 2
    return state


@pytest.mark.asyncio
async def test_graph_runs_linear_chain() -> None:
    rid = uuid4()
    oid = uuid4()
    st = GraphState(run_id=rid, organization_id=oid, prompt="x")
    nodes = {
        "a": GraphNode("a", _a),
        "b": GraphNode("b", _b),
        "end": GraphNode("end", lambda s: s),
    }
    edges = [
        GraphEdge("a", "b"),
        GraphEdge("b", "end"),
    ]
    g = Graph(nodes, edges, entry="a", terminal="end")
    out = await g.run(st)
    assert out.node_timings_ms.get("a", 0) >= 0
    assert out.status == "completed"
