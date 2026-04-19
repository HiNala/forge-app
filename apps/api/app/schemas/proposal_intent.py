"""Structured intent for proposal Studio/Orchestration (W-02)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ClientInfo(BaseModel):
    name: str = Field(..., min_length=1)
    email: str | None = None
    phone: str | None = None
    address: str | None = None


class ProjectInfo(BaseModel):
    title: str = Field(..., min_length=1)
    location: str | None = None


class ScopeItem(BaseModel):
    phase: str
    description: str
    deliverables: list[str] = Field(default_factory=list)


class LineItemDraft(BaseModel):
    category: str = "General"
    description: str = ""
    qty: float = 1.0
    unit: str = "ea"
    rate_cents: int = 0
    total_cents: int = 0


class Milestone(BaseModel):
    milestone: str
    date: str | None = None
    description: str = ""


class ProposalIntent(BaseModel):
    page_type: Literal["proposal"] = "proposal"
    client: ClientInfo
    project: ProjectInfo
    scope_items: list[ScopeItem] = Field(default_factory=list)
    line_items: list[LineItemDraft] = Field(default_factory=list)
    timeline: list[Milestone] = Field(default_factory=list)
    payment_terms: str | None = None
    expires_in_days: int = 30
    special_terms: list[str] = Field(default_factory=list)

    model_config = {"extra": "ignore"}


PROPOSAL_KEYWORDS = frozenset(
    {
        "proposal",
        "bid",
        "quote",
        "estimate",
        "scope of work",
        "project for",
        "quotation",
    },
)


def prompt_suggests_proposal(prompt: str) -> bool:
    p = prompt.lower()
    return any(k in p for k in PROPOSAL_KEYWORDS)
