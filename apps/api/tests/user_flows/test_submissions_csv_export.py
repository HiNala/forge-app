"""
GET /api/v1/pages/{page_id}/submissions/export — owner downloads leads as CSV.

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
async def test_owner_downloads_csv_attachment_with_rows() -> None:
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@csv.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="CSV Org", slug=f"cs-{uid.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        s.add(
            Page(
                organization_id=oid,
                slug="leads",
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
            f"/p/{org}/leads/submit",
            json={"message": "Quote please", "email": "lead@example.com"},
        )

        r = await client.get(f"/api/v1/pages/{page_id}/submissions/export", headers=h)
        assert r.status_code == 200
        assert "text/csv" in (r.headers.get("content-type") or "")
        disp = r.headers.get("content-disposition") or ""
        assert "attachment" in disp.lower()
        assert "submissions-" in disp
        body = r.text
        assert "submission_id" in body
        assert "Quote please" in body
        assert "lead@example.com" in body


@pytest.mark.asyncio
async def test_export_csv_404_for_other_tenants_page() -> None:
    await require_postgres()
    from app.main import app

    u_a = uuid.uuid4()
    u_b = uuid.uuid4()
    o_a = uuid.uuid4()
    o_b = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        for u, em in ((u_a, "ca"), (u_b, "cb")):
            s.add(
                User(
                    id=u,
                    email=f"{u.hex}@{em}.ex.com",
                    auth_provider_id=f"clerk_{u}",
                )
            )
        s.add(Organization(id=o_a, name="A", slug=f"ca-{u_a.hex[:6]}"))
        s.add(Organization(id=o_b, name="B", slug=f"cb-{u_b.hex[:6]}"))
        await s.flush()
        s.add(Membership(user_id=u_a, organization_id=o_a, role="owner"))
        s.add(Membership(user_id=u_b, organization_id=o_b, role="owner"))
        s.add(
            Page(
                organization_id=o_a,
                slug="z",
                page_type="landing",
                title="Z",
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
            f"/api/v1/pages/{pid}/submissions/export",
            headers=forge_test_headers(u_b, o_b),
        )
    assert r.status_code == 404
