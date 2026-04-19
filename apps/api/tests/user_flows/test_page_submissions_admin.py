"""
GET /api/v1/pages/{page_id}/submissions — org members review inbound leads.

Requires PostgreSQL.
"""

from __future__ import annotations

import asyncio
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
async def test_list_submissions_returns_rows_newest_first() -> None:
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@adm.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Adm Org", slug=f"ad-{uid.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        s.add(
            Page(
                organization_id=oid,
                slug="lead",
                page_type="landing",
                title="Leads",
                current_html=VALID_PUBLISHABLE_HTML,
                form_schema={"required": ["message"]},
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
        org = pub.json()["public_url"].split("/p/")[1].split("/")[0]

        await client.post(
            f"/p/{org}/lead/submit",
            json={"message": "First", "email": "a@b.com"},
        )
        await client.post(
            f"/p/{org}/lead/submit",
            json={"message": "Second", "email": "c@d.com"},
        )

        r = await client.get(f"/api/v1/pages/{page_id}/submissions", headers=h)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert len(data["items"]) == 2
        assert data["items"][0]["payload"]["message"] == "Second"
        assert data["items"][1]["payload"]["message"] == "First"


@pytest.mark.asyncio
async def test_list_submissions_404_for_other_tenants_page() -> None:
    await require_postgres()
    from app.main import app

    u_a = uuid.uuid4()
    u_b = uuid.uuid4()
    o_a = uuid.uuid4()
    o_b = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        for u, em in ((u_a, "a"), (u_b, "b")):
            s.add(
                User(
                    id=u,
                    email=f"{u.hex}@{em}.ex.com",
                    auth_provider_id=f"clerk_{u}",
                )
            )
        s.add(Organization(id=o_a, name="A", slug=f"a-{u_a.hex[:6]}"))
        s.add(Organization(id=o_b, name="B", slug=f"b-{u_b.hex[:6]}"))
        await s.flush()
        s.add(Membership(user_id=u_a, organization_id=o_a, role="owner"))
        s.add(Membership(user_id=u_b, organization_id=o_b, role="owner"))
        s.add(
            Page(
                organization_id=o_a,
                slug="x",
                page_type="landing",
                title="X",
                current_html=VALID_PUBLISHABLE_HTML,
            )
        )
        await s.commit()

    async with AsyncSessionLocal() as s2:
        p = (await s2.execute(select(Page).where(Page.organization_id == o_a))).scalars().first()
        assert p is not None
        pid = p.id

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get(
            f"/api/v1/pages/{pid}/submissions",
            headers=forge_test_headers(u_b, o_b),
        )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_submissions_cursor_pagination_returns_next_page() -> None:
    """Paginate with ``limit`` and cursor ``before`` (from prior ``next_before``)."""
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@page.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Page Org", slug=f"pg-{uid.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        s.add(
            Page(
                organization_id=oid,
                slug="inbox",
                page_type="landing",
                title="Inbox",
                current_html=VALID_PUBLISHABLE_HTML,
                form_schema={"required": ["message"]},
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
        org = pub.json()["public_url"].split("/p/")[1].split("/")[0]

        for i in range(3):
            await client.post(
                f"/p/{org}/inbox/submit",
                json={"message": f"M{i}", "email": f"u{i}@t.com"},
            )
            if i < 2:
                await asyncio.sleep(0.05)

        r1 = await client.get(
            f"/api/v1/pages/{page_id}/submissions",
            headers=h,
            params={"limit": 2},
        )
        assert r1.status_code == 200
        b1 = r1.json()
        assert len(b1["items"]) == 2
        assert b1["next_before"] is not None

        r2 = await client.get(
            f"/api/v1/pages/{page_id}/submissions",
            headers=h,
            params={"limit": 2, "before": b1["next_before"]},
        )
        assert r2.status_code == 200
        b2 = r2.json()
        assert len(b2["items"]) == 1
        assert b2["items"][0]["payload"]["message"] == "M0"
        assert b2.get("next_before") is None


@pytest.mark.asyncio
async def test_viewer_can_list_submissions() -> None:
    """Teammates with viewer role can review leads (read-only in product; list is allowed)."""
    await require_postgres()
    from app.main import app

    owner_id = uuid.uuid4()
    viewer_id = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=owner_id,
                email=f"{owner_id.hex}@own.example.com",
                auth_provider_id=f"clerk_{owner_id}",
            )
        )
        s.add(
            User(
                id=viewer_id,
                email=f"{viewer_id.hex}@view.example.com",
                auth_provider_id=f"clerk_{viewer_id}",
            )
        )
        s.add(Organization(id=oid, name="Team", slug=f"tm-{owner_id.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=owner_id, organization_id=oid, role="owner"))
        s.add(Membership(user_id=viewer_id, organization_id=oid, role="viewer"))
        s.add(
            Page(
                organization_id=oid,
                slug="form",
                page_type="landing",
                title="Form",
                current_html=VALID_PUBLISHABLE_HTML,
                form_schema={"required": ["message"]},
            )
        )
        await s.commit()

    async with AsyncSessionLocal() as s2:
        p = (await s2.execute(select(Page).where(Page.organization_id == oid))).scalars().first()
        assert p is not None
        pid = p.id

    h_owner = forge_test_headers(owner_id, oid)
    h_viewer = forge_test_headers(viewer_id, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        pub = await client.post(f"/api/v1/pages/{pid}/publish", headers=h_owner)
        assert pub.status_code == 200
        org = pub.json()["public_url"].split("/p/")[1].split("/")[0]

        await client.post(
            f"/p/{org}/form/submit",
            json={"message": "Lead", "email": "x@y.com"},
        )

        r = await client.get(f"/api/v1/pages/{pid}/submissions", headers=h_viewer)
        assert r.status_code == 200
        assert len(r.json()["items"]) == 1
