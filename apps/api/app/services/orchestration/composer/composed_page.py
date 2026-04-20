"""Composer output bundle."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.services.orchestration.component_lib.schema import ComponentTree, ProposalComponentTree


@dataclass
class ComposedPage:
    html: str
    tree: ComponentTree | ProposalComponentTree
    metadata: dict[str, Any] = field(default_factory=dict)
