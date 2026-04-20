"""Graph execution state — Mission O-02."""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan


class RunBudget(BaseModel):
    max_tokens: int = 30_000
    max_llm_calls: int = 8
    max_wall_time_seconds: float = 45.0
    max_cost_cents: int = 50
    tokens_used: int = 0
    llm_calls: int = 0
    cost_cents: int = 0


class ReviewResult(BaseModel):
    """Output of the review agent (O-04)."""

    fixable_count: int = 0
    suggestions_count: int = 0
    quality_score: int = 0
    summary: str = ""
    findings: list[dict[str, Any]] = Field(default_factory=list)
    iteration: int = 0


class GraphState(BaseModel):
    """Shared state for orchestration graphs."""

    run_id: UUID
    organization_id: UUID
    user_id: UUID | None = None
    prompt: str = ""
    provider: str | None = None

    context_bundle: ContextBundle | None = None
    intent: PageIntent | None = None
    page_plan: PagePlan | None = None
    html: str = ""
    review: ReviewResult | None = None
    iterations: int = 0
    max_review_iterations: int = 3
    degraded_quality: bool = False
    errors: list[str] = Field(default_factory=list)
    budget: RunBudget = Field(default_factory=RunBudget)
    node_timings_ms: dict[str, int] = Field(default_factory=dict)
    status: Literal["running", "completed", "degraded", "aborted", "failed"] = "running"
