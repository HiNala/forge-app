"""GL-02 — platform RBAC gates on admin_platform routes."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.models import User
from app.db.models.platform_rbac import PlatformUserRole
from app.db.session import AsyncSessionLocal
from app.main import app
from tests.support.postgres import require_postgres


def _headers(user_id: uuid.UUID) -> dict[str, str]:
    return {"x-forge-test-user-id": str(user_id)}


@pytest.mark.asyncio
async def test_platform_session_forbidden_without_role() -> None:
    await require_postgres()
    uid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(User(id=uid, email=f"{uid.hex}@gl02.example.com", auth_provider_id=f"c_{uid.hex}", is_admin=False))
        await s.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/platform/session", headers=_headers(uid))
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_platform_session_ok_for_legacy_is_admin() -> None:
    await require_postgres()
    uid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(User(id=uid, email=f"{uid.hex}@gl02.example.com", auth_provider_id=f"c_{uid.hex}", is_admin=True))
        await s.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/platform/session", headers=_headers(uid))
    assert r.status_code == 200
    body = r.json()
    perms = body["permissions"]
    assert "orgs:read_list" in perms
    # Legacy is_admin must not depend on a fully seeded platform_permissions table.
    assert "billing:read_mrr" in perms
    assert len(perms) >= 25


@pytest.mark.asyncio
async def test_support_role_can_list_orgs() -> None:
    await require_postgres()
    uid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(User(id=uid, email=f"{uid.hex}@gl02.example.com", auth_provider_id=f"c_{uid.hex}", is_admin=False))
        s.add(PlatformUserRole(user_id=uid, role_key="support"))
        await s.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/organizations", headers=_headers(uid))
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_analyst_cannot_list_orgs() -> None:
    await require_postgres()
    uid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(User(id=uid, email=f"{uid.hex}@gl02.example.com", auth_provider_id=f"c_{uid.hex}", is_admin=False))
        s.add(PlatformUserRole(user_id=uid, role_key="analyst"))
        await s.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/organizations", headers=_headers(uid))
    assert r.status_code == 403
