"""GL-03 — public submit rejects hostile payloads without server errors (baseline probes)."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

_SQLISH = "'; DROP TABLE pages; --"
_XSS = "<script>alert(1)</script>"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "org_slug,page_slug",
    [
        ("acme", "contact"),
        ("acme'; --", "x"),
        ("../../../etc", "passwd"),
    ],
)
async def test_public_submit_path_never_500(org_slug: str, page_slug: str) -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            f"/p/{org_slug}/{page_slug}/submit",
            json={
                "email": f"u{_SQLISH}@test.local",
                "name": _XSS,
                "message": _SQLISH,
            },
        )
    assert r.status_code != 500
    assert r.status_code in (400, 404, 422)


@pytest.mark.asyncio
async def test_public_submit_malicious_json_body() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/p/o/p/submit",
            json={
                "email": "a@b.com",
                "name": _XSS,
                "message": _SQLISH,
                "extra": {"nested": _XSS},
            },
        )
    assert r.status_code != 500
