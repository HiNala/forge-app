"""Mission 04 — publish snapshot + public HTML read."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.db.models import Membership, Organization, Page, PageVersion, User
from app.db.session import AsyncSessionLocal
from tests.support.headers import forge_test_headers
from tests.support.html_samples import VALID_PUBLISHABLE_HTML
from tests.support.postgres import require_postgres


@pytest.mark.asyncio
async def test_publish_then_public_get_returns_snapshot() -> None:
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@pub.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Pub Org", slug=f"pub-{uid.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        s.add(
            Page(
                organization_id=oid,
                slug="contact",
                page_type="landing",
                title="Contact us",
                current_html=VALID_PUBLISHABLE_HTML,
            )
        )
        await s.commit()

    async with AsyncSessionLocal() as s2:
        p = (await s2.execute(select(Page).where(Page.organization_id == oid))).scalars().first()
        assert p is not None
        page_id = p.id
        org = await s2.get(Organization, oid)
        assert org is not None
        org_slug = org.slug

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r_pub = await client.post(
            f"/api/v1/pages/{page_id}/publish",
            headers=forge_test_headers(uid, oid),
        )
        assert r_pub.status_code == 200
        body = r_pub.json()
        assert body["status"] == "live"
        assert "/p/" in body["public_url"]

        r_get = await client.get(f"/api/v1/public/pages/{org_slug}/contact")
        assert r_get.status_code == 200
        data = r_get.json()
        assert data["title"] == "Contact us"
        assert data["slug"] == "contact"
        assert data["organization_slug"] == org_slug
        assert "Hello world this is long enough" in data["html"]
        assert "<script>" in data["html"] and "page_view" in data["html"]

    async with AsyncSessionLocal() as s3:
        q = select(PageVersion).where(PageVersion.page_id == page_id)
        rows = (await s3.execute(q)).scalars().all()
        assert len(rows) == 1
        assert rows[0].version_number == 1


@pytest.mark.asyncio
async def test_unpublish_clears_public_404() -> None:
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@unpub.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Unpub", slug=f"un-{uid.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        s.add(
            Page(
                organization_id=oid,
                slug="x",
                page_type="landing",
                title="X",
                current_html=VALID_PUBLISHABLE_HTML,
            )
        )
        await s.commit()

    async with AsyncSessionLocal() as s2:
        p = (await s2.execute(select(Page).where(Page.organization_id == oid))).scalars().first()
        assert p is not None
        pid = p.id
        org = await s2.get(Organization, oid)
        assert org is not None
        oslug = org.slug

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(f"/api/v1/pages/{pid}/publish", headers=forge_test_headers(uid, oid))
        assert (await client.get(f"/api/v1/public/pages/{oslug}/x")).status_code == 200
        await client.post(f"/api/v1/pages/{pid}/unpublish", headers=forge_test_headers(uid, oid))
        assert (await client.get(f"/api/v1/public/pages/{oslug}/x")).status_code == 404
