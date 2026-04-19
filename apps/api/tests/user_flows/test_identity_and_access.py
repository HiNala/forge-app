"""
Who can call what — unauthenticated visitors vs signed-in app users.

These checks do not require PostgreSQL: they fail fast on missing test auth headers.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_visitor_without_session_cannot_read_single_page() -> None:
    """Studio page detail is tenant-private — no session, no GET /pages/{id}."""
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get(f"/api/v1/pages/{uuid.uuid4()}")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_visitor_without_session_cannot_patch_page() -> None:
    """Renaming or archiving a page requires sign-in."""
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.patch(
            f"/api/v1/pages/{uuid.uuid4()}",
            json={"title": "Hijack"},
        )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_visitor_without_session_cannot_list_pages() -> None:
    """A browser with no Forge session should not read tenant page lists."""
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/api/v1/pages")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_visitor_without_session_cannot_create_page() -> None:
    """Anonymous POST /pages must be rejected."""
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/api/v1/pages",
            json={"slug": "landing", "title": "Hi"},
        )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_visitor_without_session_cannot_export_submissions_csv() -> None:
    """Spreadsheet export is authenticated like the submissions table."""
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get(f"/api/v1/pages/{uuid.uuid4()}/submissions/export")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_visitor_without_session_cannot_list_page_submissions() -> None:
    """Inbound leads are tenant-private — no session means no GET /pages/…/submissions."""
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get(f"/api/v1/pages/{uuid.uuid4()}/submissions")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_visitor_without_session_cannot_delete_page() -> None:
    """Removing a page requires a signed-in member with editor rights."""
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.delete(f"/api/v1/pages/{uuid.uuid4()}")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_visitor_without_session_cannot_list_page_versions() -> None:
    """Publish history is tenant-private — no GET /pages/{id}/versions without session."""
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get(f"/api/v1/pages/{uuid.uuid4()}/versions")
    assert r.status_code == 401
