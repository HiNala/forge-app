"""GL-03 — token-gated E2E seed endpoint.

Requires PostgreSQL schema at Alembic head (``uv run alembic upgrade head``) so
``users`` and related tables match ORM models (e.g. GL-02 platform columns).
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_e2e_seed_org_requires_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "FORGE_E2E_TOKEN", "secret-e2e")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post("/api/v1/__e2e__/seed-org")
        assert r.status_code == 404
        r2 = await client.post(
            "/api/v1/__e2e__/seed-org",
            headers={"X-Forge-E2e-Token": "wrong"},
        )
        assert r2.status_code == 404
        r3 = await client.post(
            "/api/v1/__e2e__/seed-org",
            headers={"X-Forge-E2e-Token": "secret-e2e"},
        )
        assert r3.status_code == 200
        body = r3.json()
        assert "user_id" in body and "organization_id" in body and "slug" in body


@pytest.mark.asyncio
async def test_e2e_seed_disabled_when_no_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "FORGE_E2E_TOKEN", "")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/api/v1/__e2e__/seed-org",
            headers={"X-Forge-E2e-Token": "any"},
        )
        assert r.status_code == 404
