"""BI-04 — API token scope enforcement and ``/orgs/current`` aliases."""

from __future__ import annotations

import hashlib
import secrets
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.models import ApiToken, Membership, Organization, User
from app.db.session import AsyncSessionLocal
from app.main import app
from tests.support.postgres import require_postgres


@pytest.mark.asyncio
async def test_api_token_read_pages_allows_get_not_post() -> None:
    await require_postgres()
    ua = uuid.uuid4()
    org_id = uuid.uuid4()
    secret_body = secrets.token_urlsafe(32)
    full = f"forge_live_{secret_body}"
    prefix = secret_body[:8]
    digest = hashlib.sha256(full.encode()).hexdigest()

    async with AsyncSessionLocal() as s:
        s.add_all(
            [
                User(id=ua, email=f"{ua.hex}@t.example.com", auth_provider_id=f"clerk_{ua}"),
                Organization(id=org_id, name="O", slug=f"o-{ua.hex[:8]}"),
            ]
        )
        await s.flush()
        s.add(Membership(user_id=ua, organization_id=org_id, role="owner"))
        s.add(
            ApiToken(
                organization_id=org_id,
                created_by=ua,
                name="read-pages",
                prefix=prefix,
                token_hash=digest,
                scopes=["read:pages"],
            )
        )
        await s.commit()

    transport = ASGITransport(app=app)
    headers = {
        "Authorization": f"Bearer {full}",
        "x-forge-active-org-id": str(org_id),
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r_list = await client.get("/api/v1/pages", headers=headers)
        assert r_list.status_code == 200
        r_create = await client.post(
            "/api/v1/pages",
            json={"slug": "scope-test", "page_type": "contact_form", "title": "T"},
            headers=headers,
        )
    assert r_create.status_code == 403
    assert "write:pages" in str(r_create.json())


@pytest.mark.asyncio
async def test_orgs_current_settings_alias_matches_org_settings() -> None:
    await require_postgres()
    ua = uuid.uuid4()
    org_id = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add_all(
            [
                User(id=ua, email=f"{ua.hex}@alias.example.com", auth_provider_id=f"clerk_{ua}"),
                Organization(id=org_id, name="O", slug=f"o-{ua.hex[:8]}"),
            ]
        )
        await s.flush()
        s.add(Membership(user_id=ua, organization_id=org_id, role="owner"))
        await s.commit()

    transport = ASGITransport(app=app)
    h = {
        "x-forge-test-user-id": str(ua),
        "x-forge-active-org-id": str(org_id),
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r1 = await client.get("/api/v1/org/settings", headers=h)
        r2 = await client.get("/api/v1/orgs/current/settings", headers=h)
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json() == r2.json()
