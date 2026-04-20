"""Review agent — stub until O-04 (mixture-of-experts)."""

from __future__ import annotations

from app.services.orchestration.graph_state import GraphState, ReviewResult


async def run_reviewer_stub(state: GraphState) -> GraphState:
    """No-op reviewer: always pass with zero fixables."""
    state.review = ReviewResult(fixable_count=0, suggestions_count=0, findings=[])
    return state
