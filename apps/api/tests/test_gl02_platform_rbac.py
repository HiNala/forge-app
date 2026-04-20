"""GL-02 — platform RBAC gates and session endpoint."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.db.session import AsyncSessionLocal
from tests.support.headers import forge_test_headers
from tests.support.postgres import require_postgres


@pytest.mark.asyncio
async def test_platform_session_403_without_access() -> None:
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        from app.db.models import Membership, Organization, User

        s.add(User(id=uid, email=f"{uid.hex}@gl02.example.com", auth_provider_id=f"c_{uid}"))
        s.add(Organization(id=oid, name="GL Org", slug=f"g{uid.hex[:6]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        await s.commit()

    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/platform/session", headers=h)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_platform_session_support_role() -> None:
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        from app.db.models import Membership, Organization, User

        s.add(User(id=uid, email=f"{uid.hex}@gl02b.example.com", auth_provider_id=f"c_{uid}"))
        s.add(Organization(id=oid, name="GL Org B", slug=f"h{uid.hex[:6]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        await s.commit()

    async with AsyncSessionLocal() as s2:
        await s2.execute(
            text(
                "INSERT INTO platform_user_roles (user_id, role_key) "
                "VALUES (CAST(:u AS uuid), 'support') ON CONFLICT DO NOTHING"
            ),
            {"u": str(uid)},
        )
        await s2.commit()

    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/platform/session", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert "orgs:read_list" in body["permissions"]
    assert "support" in body["platform_roles"]


@pytest.mark.asyncio
async def test_orgs_list_denied_for_analyst() -> None:
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        from app.db.models import Membership, Organization, User

        s.add(User(id=uid, email=f"{uid.hex}@gl02c.example.com", auth_provider_id=f"c_{uid}"))
        s.add(Organization(id=oid, name="GL Org C", slug=f"i{uid.hex[:6]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        await s.commit()

    async with AsyncSessionLocal() as s2:
        await s2.execute(
            text(
                "INSERT INTO platform_user_roles (user_id, role_key) "
                "VALUES (CAST(:u AS uuid), 'analyst') ON CONFLICT DO NOTHING"
            ),
            {"u": str(uid)},
        )
        await s2.commit()

    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/organizations", headers=h)
    assert r.status_code == 403
