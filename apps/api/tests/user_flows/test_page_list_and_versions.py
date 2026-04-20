"""
GET /api/v1/pages (empty catalog) and GET …/versions (after publish).

Requires PostgreSQL.
"""

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


@pytest.mark.asyncio
async def test_revert_copies_version_to_current_and_appends_version_row() -> None:
    """POST …/revert/{version_id} restores draft from snapshot and adds a new PageVersion."""
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@rev.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Rev Org", slug=f"rv-{uid.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        s.add(
            Page(
                organization_id=oid,
                slug="revert-me",
                page_type="landing",
                title="Revert",
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
        ver = await client.get(f"/api/v1/pages/{page_id}/versions", headers=h)
        assert ver.status_code == 200
        v1_id = ver.json()[0]["id"]

        async with AsyncSessionLocal() as s3:
            row = await s3.get(Page, page_id)
            assert row is not None
            row.current_html = "<html><body><p>changed</p></body></html>"
            await s3.commit()

        rev = await client.post(
            f"/api/v1/pages/{page_id}/revert/{v1_id}",
            headers=h,
        )
        assert rev.status_code == 200
        body = rev.json()
        assert body["current_html"] == VALID_PUBLISHABLE_HTML

        versions = (await client.get(f"/api/v1/pages/{page_id}/versions", headers=h)).json()
        assert len(versions) == 2
        assert versions[0]["version_number"] == 2
        assert versions[1]["version_number"] == 1

    async with AsyncSessionLocal() as s4:
        v2 = (
            await s4.execute(
                select(PageVersion).where(
                    PageVersion.page_id == page_id,
                    PageVersion.version_number == 2,
                )
            )
        ).scalar_one()
        assert v2.html == VALID_PUBLISHABLE_HTML


@pytest.mark.asyncio
async def test_duplicate_creates_draft_with_derived_slug() -> None:
    """POST …/duplicate copies content into a new draft page."""
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@dup.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Dup Org", slug=f"dp-{uid.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        s.add(
            Page(
                organization_id=oid,
                slug="original",
                page_type="landing",
                title="Original",
                current_html=VALID_PUBLISHABLE_HTML,
                form_schema={"fields": [{"name": "email", "type": "email"}]},
            )
        )
        await s.commit()

    async with AsyncSessionLocal() as s2:
        p = (await s2.execute(select(Page).where(Page.slug == "original"))).scalars().first()
        assert p is not None
        page_id = p.id

    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        dup = await client.post(f"/api/v1/pages/{page_id}/duplicate", headers=h)
        assert dup.status_code == 200
        data = dup.json()
        assert data["status"] == "draft"
        assert data["title"] == "Original (copy)"
        assert data["slug"].startswith("original-copy")
        new_id = uuid.UUID(data["id"])
        assert new_id != page_id

        pages = await client.get("/api/v1/pages", headers=h)
        assert pages.status_code == 200
        slugs = {row["slug"] for row in pages.json()}
        assert "original" in slugs
        assert data["slug"] in slugs
