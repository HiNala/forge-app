"""Landing / promotion composer."""

from __future__ import annotations

from app.services.orchestration.component_lib.schema import ComponentTree
from app.services.orchestration.composer.base import BaseComposer


class LandingComposer(BaseComposer):
    workflow_key = "landing"
    prompt_file = "landing.v1.md"
    schema = ComponentTree


class PromotionComposer(BaseComposer):
    workflow_key = "promotion"
    prompt_file = "promotion.v1.md"
    schema = ComponentTree
