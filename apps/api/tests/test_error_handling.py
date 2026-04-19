"""BI-02 — unified JSON error shape (request_id, validation flattening)."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.models import Membership, Organization, User
from app.db.session import AsyncSessionLocal
from app.main import app


@pytest.mark.asyncio
async def test_http_exception_includes_request_id() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get(
            "/api/v1/pages",
            headers={"X-Request-ID": "err-req-1"},  # no auth → 401
        )
    assert r.status_code == 401
    data = r.json()
    assert data.get("request_id") == "err-req-1"
    assert "detail" in data


@pytest.mark.asyncio
async def test_validation_error_flattens_fields() -> None:
    ua = uuid.uuid4()
    org = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add_all(
            [
                User(id=ua, email=f"{ua.hex}@ve.example.com", auth_provider_id=f"clerk_{ua}"),
                Organization(id=org, name="O", slug=f"o-{ua.hex[:8]}"),
            ]
        )
        await s.flush()
        s.add(Membership(user_id=ua, organization_id=org, role="owner"))
        await s.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/api/v1/pages",
            json={},
            headers={
                "X-Request-ID": "val-1",
                "x-forge-test-user-id": str(ua),
                "x-forge-active-org-id": str(org),
            },
        )
    assert r.status_code == 422
    data = r.json()
    assert data.get("code") == "validation_error"
    assert data.get("request_id") == "val-1"
    assert isinstance(data.get("errors"), list)
