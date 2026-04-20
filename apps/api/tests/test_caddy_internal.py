"""Caddy on-demand TLS validation (Mission 08)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.config import settings
from app.db.session import AsyncSessionLocal
from tests.support.postgres import require_postgres


@pytest.mark.asyncio
async def test_caddy_validate_returns_200_for_verified_hostname() -> None:
    await require_postgres()
    from app.main import app

    oid = uuid.uuid4()
    slug = f"cd-{oid.hex[:8]}"
    host = f"verified-{slug}.example.test"

    async with AsyncSessionLocal() as s:
        await s.execute(
            text(
                """
                INSERT INTO organizations (id, slug, name, plan)
                VALUES (:id, :slug, :name, 'pro')
                """
            ),
            {"id": oid, "slug": slug, "name": "Caddy domain test"},
        )
        await s.execute(
            text(
                """
                INSERT INTO custom_domains (organization_id, hostname, verified_at)
                VALUES (:oid, :host, :v)
                """
            ),
            {"oid": oid, "host": host, "v": datetime.now(UTC)},
        )
        await s.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/internal/caddy/validate", params={"domain": host})
    assert r.status_code == 200

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r2 = await client.get("/internal/caddy/validate", params={"domain": "not-in-db.example.test"})
    assert r2.status_code == 404


@pytest.mark.asyncio
async def test_caddy_validate_unverified_hostname_is_404() -> None:
    await require_postgres()
    from app.main import app

    oid = uuid.uuid4()
    slug = f"uv-{oid.hex[:8]}"
    host = f"pending-{slug}.example.test"

    async with AsyncSessionLocal() as s:
        await s.execute(
            text(
                """
                INSERT INTO organizations (id, slug, name, plan)
                VALUES (:id, :slug, :name, 'pro')
                """
            ),
            {"id": oid, "slug": slug, "name": "Unverified domain test"},
        )
        await s.execute(
            text(
                """
                INSERT INTO custom_domains (organization_id, hostname, verified_at)
                VALUES (:oid, :host, NULL)
                """
            ),
            {"oid": oid, "host": host},
        )
        await s.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/internal/caddy/validate", params={"domain": host})
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_caddy_validate_production_requires_token(monkeypatch: pytest.MonkeyPatch) -> None:
    await require_postgres()
    from app.main import app

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "CADDY_INTERNAL_TOKEN", "")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/internal/caddy/validate", params={"domain": "any.example.test"})
    assert r.status_code == 503


@pytest.mark.asyncio
async def test_caddy_validate_production_accepts_matching_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await require_postgres()
    from app.main import app

    oid = uuid.uuid4()
    slug = f"pr-{oid.hex[:8]}"
    host = f"prod-{slug}.example.test"

    async with AsyncSessionLocal() as s:
        await s.execute(
            text(
                """
                INSERT INTO organizations (id, slug, name, plan)
                VALUES (:id, :slug, :name, 'pro')
                """
            ),
            {"id": oid, "slug": slug, "name": "Caddy prod token test"},
        )
        await s.execute(
            text(
                """
                INSERT INTO custom_domains (organization_id, hostname, verified_at)
                VALUES (:oid, :host, :v)
                """
            ),
            {"oid": oid, "host": host, "v": datetime.now(UTC)},
        )
        await s.commit()

    secret = "caddy-internal-test-secret"
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "CADDY_INTERNAL_TOKEN", secret)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get(
            "/internal/caddy/validate",
            params={"domain": host},
            headers={"X-Forge-Caddy-Token": secret},
        )
    assert r.status_code == 200
