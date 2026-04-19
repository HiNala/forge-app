"""BI-02 — rate limit 429 JSON when ``RATE_LIMIT_IN_TESTS`` is on."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

import app.middleware.rate_limit as rate_limit_mod
from app.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_auth_route_rate_limited_after_threshold(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "RATE_LIMIT_IN_TESTS", True)
    monkeypatch.setattr(rate_limit_mod, "_RL_AUTH_USER_PER_MIN", 3)
    token = "Bearer " + "z" * 80

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        last = None
        for _ in range(5):
            last = await client.get(
                "/api/v1/templates",
                headers={"Authorization": token},
            )
            if last.status_code == 429:
                break
        assert last is not None
        assert last.status_code == 429
        body = last.json()
        assert body.get("code") == "rate_limited"
        assert last.headers.get("retry-after") == "60"
