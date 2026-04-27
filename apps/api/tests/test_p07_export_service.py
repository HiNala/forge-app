"""P-07 — ExportService + registry wiring smoke tests."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.db.models import Page
from app.services.export.service import export_service
from app.services.workflows.registry import WORKFLOW_REGISTRY, get_workflow_definition


def test_workflow_registry_has_export_formats_for_all_workflows() -> None:
    for key, wf in WORKFLOW_REGISTRY.items():
        assert wf.export_formats, f"{key} missing export_formats"
        for fmt in wf.export_formats:
            assert isinstance(fmt, str) and len(fmt) >= 2, f"{key} bad format id: {fmt!r}"


def test_proposal_workflow_includes_pdf_and_html_static() -> None:
    d = get_workflow_definition("proposal")
    assert d is not None
    assert "pdf_signed" in d.export_formats
    assert "html_static" in d.export_formats


@pytest.mark.asyncio
async def test_export_list_formats_pitch_deck_includes_pptx_pdf() -> None:
    org = MagicMock()
    org.plan = "trial"
    page = MagicMock(spec=Page)
    page.id = uuid4()
    page.page_type = "pitch_deck"
    page.slug = "deck"
    out = export_service.list_formats(page, org)
    ids = {x.id for x in out}
    assert "pptx" in ids
    assert "pdf" in ids


@pytest.mark.asyncio
async def test_export_run_html_static_returns_bytes() -> None:
    org = MagicMock()
    org.id = uuid4()
    org.slug = "acme"
    org.plan = "trial"
    page = MagicMock(spec=Page)
    page.id = uuid4()
    page.page_type = "landing"
    page.slug = "x"
    page.current_html = "<html><body>hi</body></html>"
    user = MagicMock()

    kind, payload = await export_service.run(
        db=AsyncMock(),
        page=page,
        org=org,
        user=user,
        request=MagicMock(),
        format_id="html_static",
    )
    assert kind == "html"
    assert b"hi" in payload
