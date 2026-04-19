"""
PATCH / DELETE pages — editors change content; viewers cannot.

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
from tests.support.postgres import require_postgres


@pytest.mark.asyncio
async def test_editor_renames_page_and_detail_reflects_title() -> None:
    """Lucy updates the page title in settings; GET /pages/{id} shows the new title."""
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    unique = uid.hex[:10]
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@patch.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Patch Org", slug=f"pt-{unique}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        await s.commit()

    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r_create = await client.post(
            "/api/v1/pages",
            json={"slug": f"pg-{unique}", "title": "Old", "page_type": "landing"},
            headers=h,
        )
        assert r_create.status_code == 200
        pid = r_create.json()["id"]

        r_patch = await client.patch(
            f"/api/v1/pages/{pid}",
            json={"title": "New title"},
            headers=h,
        )
        assert r_patch.status_code == 200
        assert r_patch.json()["title"] == "New title"

        r_get = await client.get(f"/api/v1/pages/{pid}", headers=h)
        assert r_get.status_code == 200
        assert r_get.json()["title"] == "New title"


@pytest.mark.asyncio
async def test_editor_deletes_page_and_it_disappears() -> None:
    """After delete, the page is no longer loadable (404)."""
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    unique = uid.hex[:10]
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@del.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Del Org", slug=f"dl-{unique}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        await s.commit()

    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r_create = await client.post(
            "/api/v1/pages",
            json={"slug": f"gone-{unique}", "title": "X", "page_type": "landing"},
            headers=h,
        )
        assert r_create.status_code == 200
        pid = r_create.json()["id"]

        r_del = await client.delete(f"/api/v1/pages/{pid}", headers=h)
        assert r_del.status_code == 200
        assert r_del.json().get("ok") is True

        r_get = await client.get(f"/api/v1/pages/{pid}", headers=h)
        assert r_get.status_code == 404


@pytest.mark.asyncio
async def test_viewer_cannot_rename_or_delete_page() -> None:
    """Read-only teammates must not change slugs or remove pages."""
    await require_postgres()
    from app.main import app

    owner_id = uuid.uuid4()
    viewer_id = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=owner_id,
                email=f"{owner_id.hex}@o.example.com",
                auth_provider_id=f"clerk_{owner_id}",
            )
        )
        s.add(
            User(
                id=viewer_id,
                email=f"{viewer_id.hex}@v.example.com",
                auth_provider_id=f"clerk_{viewer_id}",
            )
        )
        s.add(Organization(id=oid, name="RBAC", slug=f"rb-{owner_id.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=owner_id, organization_id=oid, role="owner"))
        s.add(Membership(user_id=viewer_id, organization_id=oid, role="viewer"))
        s.add(
            Page(
                organization_id=oid,
                slug="locked",
                page_type="landing",
                title="Locked",
            )
        )
        await s.commit()

    async with AsyncSessionLocal() as s2:
        p = (await s2.execute(select(Page).where(Page.organization_id == oid))).scalars().first()
        assert p is not None
        pid = p.id

    hv = forge_test_headers(viewer_id, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r_patch = await client.patch(
            f"/api/v1/pages/{pid}",
            json={"title": "Nope"},
            headers=hv,
        )
        assert r_patch.status_code == 403

        r_del = await client.delete(f"/api/v1/pages/{pid}", headers=hv)
        assert r_del.status_code == 403
