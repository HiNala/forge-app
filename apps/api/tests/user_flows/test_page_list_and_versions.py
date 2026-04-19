"""
GET /api/v1/pages (empty catalog) and GET …/versions (after publish).

Requires PostgreSQL.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.db.models import Membership, Organization, Page, User
from app.db.session import AsyncSessionLocal
from tests.support.headers import forge_test_headers
from tests.support.html_samples import VALID_PUBLISHABLE_HTML
from tests.support.postgres import require_postgres


@pytest.mark.asyncio
async def test_creator_sees_empty_page_list_before_first_page() -> None:
    """A new org has no landing pages yet — GET /pages returns []."""
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    unique = uid.hex[:10]
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@empty.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Empty Org", slug=f"em-{unique}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        await s.commit()

    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/pages", headers=h)
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_creator_lists_versions_after_publish() -> None:
    """After Publish, Version history shows at least one snapshot (version 1)."""
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@ver.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Ver Org", slug=f"vr-{uid.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        s.add(
            Page(
                organization_id=oid,
                slug="live",
                page_type="landing",
                title="Live",
                current_html=VALID_PUBLISHABLE_HTML,
            )
        )
        await s.commit()

    async with AsyncSessionLocal() as s2:
        p = (await s2.execute(select(Page).where(Page.organization_id == oid))).scalars().first()
        assert p is not None
        page_id = p.id

    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        pub = await client.post(f"/api/v1/pages/{page_id}/publish", headers=h)
        assert pub.status_code == 200

        r = await client.get(f"/api/v1/pages/{page_id}/versions", headers=h)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) == 1
        assert rows[0]["version_number"] == 1
        assert "published_at" in rows[0]
