"""BI-02 — rate limit returns 429 with Retry-After when ``FORCE_RATE_LIMIT_IN_TESTS`` is on."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

import app.middleware.rate_limit as rate_limit_mod


@pytest.mark.asyncio
async def test_rate_limit_triggers_429_when_forced(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(rate_limit_mod.settings, "FORCE_RATE_LIMIT_IN_TESTS", True)
    monkeypatch.setattr(rate_limit_mod.settings, "ENVIRONMENT", "test")
    monkeypatch.setattr(rate_limit_mod, "_RL_AUTH_USER_PER_MIN", 1)

    from app.main import app

    transport = ASGITransport(app=app)
    auth = {"authorization": "Bearer " + "x" * 32}
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get("/api/v1/pages", headers=auth)
        r2 = await client.get("/api/v1/pages", headers=auth)
    assert r2.status_code == 429
    body = r2.json()
    assert body.get("code") == "rate_limited"
    assert "Retry-After" in r2.headers
