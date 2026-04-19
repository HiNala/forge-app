"""Public marketing demo SSE + per-IP cooldown."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_public_demo_stream_returns_sse_and_second_request_429() -> None:
    from app.api.v1 import public_demo as pd
    from app.main import app

    pd._local_demo_last.clear()

    ip = f"198.51.100.{uuid.uuid4().int % 250 + 1}"
    headers = {"X-Forwarded-For": ip}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r1 = await client.post(
            "/api/v1/public/demo",
            json={"prompt": "a simple contact form for a photographer"},
            headers=headers,
        )
        assert r1.status_code == 200
        assert "text/event-stream" in (r1.headers.get("content-type") or "")
        body = r1.text
        assert "event: intent" in body
        assert "event: html.complete" in body
        assert '"demo": true' in body

        r2 = await client.post(
            "/api/v1/public/demo",
            json={"prompt": "another"},
            headers=headers,
        )
        assert r2.status_code == 429
