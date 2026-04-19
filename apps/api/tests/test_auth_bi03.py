"""BI-03 — PATCH/POST/DELETE auth contract (Postgres-backed)."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.models import Membership, Organization, User
from app.db.session import AsyncSessionLocal
from app.main import app
from tests.support.postgres import require_postgres


@pytest.mark.asyncio
async def test_patch_me_updates_profile_and_timezone_prefs() -> None:
    await require_postgres()
    ua = uuid.uuid4()
    org_id = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add_all(
            [
                User(id=ua, email=f"{ua.hex}@patch.example.com", auth_provider_id=f"clerk_{ua}"),
                Organization(id=org_id, name="O", slug=f"o-{ua.hex[:8]}"),
            ]
        )
        await s.flush()
        s.add(Membership(user_id=ua, organization_id=org_id, role="owner"))
        await s.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.patch(
            "/api/v1/auth/me",
            json={
                "display_name": "Patched Name",
                "timezone": "Europe/Berlin",
                "locale": "de-DE",
            },
            headers={
                "x-forge-test-user-id": str(ua),
                "x-forge-active-org-id": str(org_id),
            },
        )
    assert r.status_code == 200
    data = r.json()
    assert data["user"]["display_name"] == "Patched Name"
    assert data["preferences"]["timezone"] == "Europe/Berlin"
    assert data["preferences"]["locale"] == "de-DE"


@pytest.mark.asyncio
async def test_post_preferences_theme() -> None:
    await require_postgres()
    ua = uuid.uuid4()
    org_id = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add_all(
            [
                User(id=ua, email=f"{ua.hex}@prefs.example.com", auth_provider_id=f"clerk_{ua}"),
                Organization(id=org_id, name="O", slug=f"po-{ua.hex[:8]}"),
            ]
        )
        await s.flush()
        s.add(Membership(user_id=ua, organization_id=org_id, role="owner"))
        await s.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/api/v1/auth/preferences",
            json={"theme": "dark", "sidebar_collapsed": True},
            headers={
                "x-forge-test-user-id": str(ua),
                "x-forge-active-org-id": str(org_id),
            },
        )
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    async with AsyncSessionLocal() as s:
        u = await s.get(User, ua)
        assert u is not None
        assert u.user_preferences.get("theme") == "dark"
        assert u.user_preferences.get("sidebar_collapsed") is True


@pytest.mark.asyncio
async def test_delete_me_soft_deletes() -> None:
    await require_postgres()
    ua = uuid.uuid4()
    org_id = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add_all(
            [
                User(id=ua, email=f"{ua.hex}@del.example.com", auth_provider_id=f"clerk_{ua}"),
                Organization(id=org_id, name="O", slug=f"d-{ua.hex[:8]}"),
            ]
        )
        await s.flush()
        s.add(Membership(user_id=ua, organization_id=org_id, role="owner"))
        await s.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.delete(
            "/api/v1/auth/me",
            headers={
                "x-forge-test-user-id": str(ua),
                "x-forge-active-org-id": str(org_id),
            },
        )
    assert r.status_code == 200
    assert r.json()["ok"] is True

    async with AsyncSessionLocal() as s:
        u = await s.get(User, ua)
        assert u is not None
        assert u.deleted_at is not None
