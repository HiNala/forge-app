"""Fallback composer."""

from __future__ import annotations

from app.services.orchestration.component_lib.schema import ComponentTree
from app.services.orchestration.composer.base import BaseComposer


class GenericComposer(BaseComposer):
    workflow_key = "generic"
    prompt_file = "generic.v1.md"
    schema = ComponentTree
