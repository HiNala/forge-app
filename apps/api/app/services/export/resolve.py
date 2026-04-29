"""Map ``pages.page_type`` to workflow registry key for export metadata."""

from __future__ import annotations

from typing import Any, cast

from app.db.models import Page
from app.services.orchestration.models import PAGE_TYPE_TO_WORKFLOW
from app.services.workflows.registry import get_workflow_definition


def workflow_key_for_page(page: Page) -> str:
    """Resolve registry key; fall back to a generic web page profile."""
    wk: str = PAGE_TYPE_TO_WORKFLOW.get(cast(Any, page.page_type), "web_page")
    if wk == "other":
        wk = "web_page"
    if get_workflow_definition(wk) is None:
        wk = "web_page"
    if get_workflow_definition(wk) is None:
        wk = "landing"
    return wk
