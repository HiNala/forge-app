"""
Pages: creators manage content; visitors only see published HTML.

Requires PostgreSQL (skipped automatically when the DB is unavailable).
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
async def test_visitor_gets_404_for_unknown_site_slug() -> None:
    """Someone opening /p/{org}/{page} for a non-existent org should not leak existence."""
    await require_postgres()
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/api/v1/public/pages/definitely-missing-org-xyz/anything")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_visitor_does_not_see_draft_page_even_if_html_exists() -> None:
    """Draft pages are invisible on the public URL until the owner publishes."""
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@draft.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Draft Co", slug=f"dr-{uid.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        s.add(
            Page(
                organization_id=oid,
                slug="soon",
                page_type="landing",
                title="Soon",
                status="draft",
                current_html=VALID_PUBLISHABLE_HTML,
            )
        )
        await s.commit()

    async with AsyncSessionLocal() as s2:
        org = await s2.get(Organization, oid)
        assert org is not None
        slug = org.slug

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get(f"/api/v1/public/pages/{slug}/soon")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_creator_sees_new_page_in_list_after_create() -> None:
    """An editor creates a page and it appears in GET /pages for that org."""
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    unique = uid.hex[:10]
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@creator.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Creator Org", slug=f"cr-{unique}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        await s.commit()

    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r_create = await client.post(
            "/api/v1/pages",
            json={"slug": f"page-{unique}", "title": "My landing", "page_type": "landing"},
            headers=h,
        )
        assert r_create.status_code == 200
        created_id = r_create.json()["id"]

        r_list = await client.get("/api/v1/pages", headers=h)
        assert r_list.status_code == 200
        ids = {row["id"] for row in r_list.json()}
        assert created_id in ids


@pytest.mark.asyncio
async def test_creator_opens_page_detail_for_studio() -> None:
    """From the list, opening one page loads slug, title, status, and current_html for editing."""
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    unique = uid.hex[:10]
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@detail.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Detail Org", slug=f"dt-{unique}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        await s.commit()

    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        slug = f"landing-{unique}"
        r_create = await client.post(
            "/api/v1/pages",
            json={"slug": slug, "title": "Home", "page_type": "landing"},
            headers=h,
        )
        assert r_create.status_code == 200
        pid = r_create.json()["id"]

        r = await client.get(f"/api/v1/pages/{pid}", headers=h)
        assert r.status_code == 200
        body = r.json()
        assert body["slug"] == slug
        assert body["title"] == "Home"
        assert "current_html" in body
        assert body["status"] == "draft"


@pytest.mark.asyncio
async def test_creator_cannot_reuse_slug_in_same_organization() -> None:
    """Second page with the same slug in one org returns 409 Conflict."""
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    unique = uid.hex[:10]
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@dup.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Dup Org", slug=f"dp-{unique}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        await s.commit()

    h = forge_test_headers(uid, oid)
    body = {"slug": f"twin-{unique}", "title": "A"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        assert (await client.post("/api/v1/pages", json=body, headers=h)).status_code == 200
        r2 = await client.post("/api/v1/pages", json=body, headers=h)
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_publish_rejected_when_page_html_fails_safety_checks() -> None:
    """Publishing a page with too little HTML returns 400 with a clear reason."""
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@badhtml.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Bad HTML Org", slug=f"bh-{uid.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        s.add(
            Page(
                organization_id=oid,
                slug="thin",
                page_type="landing",
                title="Thin",
                current_html="<p>short</p>",
            )
        )
        await s.commit()

    async with AsyncSessionLocal() as s2:
        p = (await s2.execute(select(Page).where(Page.organization_id == oid))).scalars().first()
        assert p is not None
        pid = p.id

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            f"/api/v1/pages/{pid}/publish",
            headers=forge_test_headers(uid, oid),
        )
    assert r.status_code == 400
    assert isinstance(r.json().get("detail"), str)


@pytest.mark.asyncio
async def test_viewer_cannot_publish_even_if_page_is_ready() -> None:
    """Teammates with viewer role can use the app but cannot go live."""
    await require_postgres()
    from app.main import app

    owner_id = uuid.uuid4()
    viewer_id = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=owner_id,
                email=f"{owner_id.hex}@owner.example.com",
                auth_provider_id=f"clerk_{owner_id}",
            )
        )
        s.add(
            User(
                id=viewer_id,
                email=f"{viewer_id.hex}@viewer.example.com",
                auth_provider_id=f"clerk_{viewer_id}",
            )
        )
        s.add(Organization(id=oid, name="Viewer Org", slug=f"vw-{owner_id.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=owner_id, organization_id=oid, role="owner"))
        s.add(Membership(user_id=viewer_id, organization_id=oid, role="viewer"))
        s.add(
            Page(
                organization_id=oid,
                slug="ready",
                page_type="landing",
                title="Ready",
                current_html=VALID_PUBLISHABLE_HTML,
            )
        )
        await s.commit()

    async with AsyncSessionLocal() as s2:
        p = (await s2.execute(select(Page).where(Page.organization_id == oid))).scalars().first()
        assert p is not None
        pid = p.id

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            f"/api/v1/pages/{pid}/publish",
            headers=forge_test_headers(viewer_id, oid),
        )
    assert r.status_code == 403
