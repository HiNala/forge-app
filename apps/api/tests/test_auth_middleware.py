"""BI-02 — bearer auth contract (Clerk path rejects invalid JWT)."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_invalid_bearer_jwt_returns_401() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get(
            "/api/v1/templates",
            headers={"Authorization": "Bearer invalid-not-a-jwt"},
        )
    assert r.status_code == 401
