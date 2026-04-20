"""Team RBAC edge cases and invite rate limit (Mission 02 TODO 34–36)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.models import Invitation, Membership, Organization, User
from app.db.session import AsyncSessionLocal


@pytest.mark.asyncio
async def test_last_owner_cannot_demote_self() -> None:
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@demote.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Solo Org", slug=f"solo-{uid.hex[:8]}"))
        await s.flush()
        m = Membership(user_id=uid, organization_id=oid, role="owner")
        s.add(m)
        await s.flush()
        mid = m.id
        await s.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.patch(
            f"/api/v1/team/members/{mid}",
            json={"role": "editor"},
            headers={
                "x-forge-test-user-id": str(uid),
                "x-forge-active-org-id": str(oid),
            },
        )
    assert r.status_code == 400
    assert r.json()["detail"] == "Cannot demote the last Owner"


@pytest.mark.asyncio
async def test_expired_invitation_cannot_be_accepted() -> None:
    from app.main import app

    inviter = uuid.uuid4()
    guest = uuid.uuid4()
    oid = uuid.uuid4()
    guest_email = f"{guest.hex}@exp.example.com"
    tok = f"expired-invite-{guest.hex}"
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=inviter,
                email=f"{inviter.hex}@inv.example.com",
                auth_provider_id=f"clerk_{inviter}",
            )
        )
        s.add(
            User(
                id=guest,
                email=guest_email,
                auth_provider_id=f"clerk_{guest}",
            )
        )
        s.add(Organization(id=oid, name="Inv Org", slug=f"inv-{guest.hex[:8]}"))
        await s.flush()
        s.add(
            Membership(user_id=inviter, organization_id=oid, role="owner"),
        )
        s.add(
            Invitation(
                organization_id=oid,
                email=guest_email,
                role="viewer",
                token=tok,
                expires_at=datetime.now(UTC) - timedelta(days=1),
                invited_by_user_id=inviter,
            ),
        )
        await s.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            f"/api/v1/team/invitations/{tok}/accept",
            headers={"x-forge-test-user-id": str(guest)},
        )
    assert r.status_code == 400
    assert r.json()["detail"] == "Invitation expired"


class _MemRedis:
    """Minimal async Redis stub for rate-limit tests."""

    def __init__(self) -> None:
        self._data: dict[str, int] = {}

    async def ping(self) -> bool:
        return True

    async def incr(self, key: str) -> int:
        self._data[key] = self._data.get(key, 0) + 1
        return self._data[key]

    async def expire(self, _key: str, _seconds: int) -> None:
        return None

    async def aclose(self) -> None:
        return None


@pytest.mark.asyncio
async def test_invite_rate_limit_blocks_eleventh_request() -> None:
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@rl.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(
            Organization(
                id=oid,
                name="RL Org",
                slug=f"rl-{uid.hex[:8]}",
                plan="enterprise",
            )
        )
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        await s.commit()

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            app.state.redis = _MemRedis()
            headers = {
                "x-forge-test-user-id": str(uid),
                "x-forge-active-org-id": str(oid),
            }
            # Freeze wall clock so the per-minute bucket cannot roll between requests.
            fixed_ts = 1_700_000_000.0
            with patch("app.services.rate_limit.time.time", return_value=fixed_ts):
                for i in range(10):
                    r = await client.post(
                        "/api/v1/team/invite",
                        json={"email": f"user{i}@rate.example.com", "role": "viewer"},
                        headers=headers,
                    )
                    assert r.status_code == 200, r.text

                r11 = await client.post(
                    "/api/v1/team/invite",
                    json={"email": "eleventh@rate.example.com", "role": "viewer"},
                    headers=headers,
                )
            assert r11.status_code == 429
            assert "Too many" in r11.json()["detail"]
    finally:
        app.state.redis = None
