"""Cross-tenant isolation (Mission 02 acceptance) — single async test avoids loop/pool issues."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, text

from app.db.models import Membership, Organization, Page, User
from app.db.session import AsyncSessionLocal, engine


def _h(user_id: uuid.UUID, org_id: uuid.UUID) -> dict[str, str]:
    return {
        "x-forge-test-user-id": str(user_id),
        "x-forge-active-org-id": str(org_id),
    }


@pytest.mark.asyncio
async def test_tenant_isolation_api_and_rls() -> None:
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # --- list: only own org pages
        ua, ub = uuid.uuid4(), uuid.uuid4()
        org_a, org_b = uuid.uuid4(), uuid.uuid4()
        async with AsyncSessionLocal() as s:
            s.add_all(
                [
                    User(id=ua, email=f"{ua.hex}@t.example.com", auth_provider_id=f"clerk_{ua}"),
                    User(id=ub, email=f"{ub.hex}@t.example.com", auth_provider_id=f"clerk_{ub}"),
                    Organization(id=org_a, name="A", slug=f"a-{ua.hex[:8]}"),
                    Organization(id=org_b, name="B", slug=f"b-{ub.hex[:8]}"),
                ]
            )
            await s.flush()
            s.add_all(
                [
                    Membership(user_id=ua, organization_id=org_a, role="owner"),
                    Membership(user_id=ub, organization_id=org_b, role="owner"),
                    Page(
                        organization_id=org_a,
                        slug="pa",
                        page_type="landing",
                        title="A",
                    ),
                    Page(
                        organization_id=org_b,
                        slug="pb",
                        page_type="landing",
                        title="B",
                    ),
                ]
            )
            await s.commit()

        async with AsyncSessionLocal() as s2:
            pa = (
                await s2.execute(select(Page).where(Page.organization_id == org_a))
            ).scalars().first()
            assert pa is not None
            page_a_id = pa.id

        r = await client.get("/api/v1/pages", headers=_h(ua, org_a))
        assert r.status_code == 200
        ids = {p["id"] for p in r.json()}
        assert str(page_a_id) in ids
        assert len(ids) == 1

        # --- GET / PATCH other org page -> 404
        ua2, ub2 = uuid.uuid4(), uuid.uuid4()
        org_a2, org_b2 = uuid.uuid4(), uuid.uuid4()
        async with AsyncSessionLocal() as s:
            s.add_all(
                [
                    User(
                        id=ua2,
                        email=f"{ua2.hex}@t2.example.com",
                        auth_provider_id=f"clerk_{ua2}",
                    ),
                    User(
                        id=ub2,
                        email=f"{ub2.hex}@t2.example.com",
                        auth_provider_id=f"clerk_{ub2}",
                    ),
                    Organization(id=org_a2, name="A2", slug=f"a2-{ua2.hex[:8]}"),
                    Organization(id=org_b2, name="B2", slug=f"b2-{ub2.hex[:8]}"),
                ]
            )
            await s.flush()
            s.add_all(
                [
                    Membership(user_id=ua2, organization_id=org_a2, role="owner"),
                    Membership(user_id=ub2, organization_id=org_b2, role="owner"),
                    Page(
                        organization_id=org_b2,
                        slug="secret",
                        page_type="landing",
                        title="Hidden",
                    ),
                ]
            )
            await s.commit()

        async with AsyncSessionLocal() as s2:
            pb = (
                await s2.execute(select(Page).where(Page.organization_id == org_b2))
            ).scalars().first()
            assert pb is not None
            page_b_id = pb.id

        r2 = await client.get(f"/api/v1/pages/{page_b_id}", headers=_h(ua2, org_a2))
        assert r2.status_code == 404

        r3 = await client.patch(
            f"/api/v1/pages/{page_b_id}",
            headers=_h(ua2, org_a2),
            json={"title": "pwned"},
        )
        assert r3.status_code == 404

    # --- SQL: non-superuser (forge_app) with tenant pointing at empty org sees 0 rows
    org_rls = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(Organization(id=org_rls, name="RLS", slug=f"rls-{org_rls.hex[:6]}"))
        await s.flush()
        s.add(
            Page(
                organization_id=org_rls,
                slug="x",
                page_type="landing",
                title="T",
            )
        )
        await s.commit()

    wrong_tenant = uuid.uuid4()
    # New physical connections: pooled asyncpg state from the httpx ASGI calls can leave
    # app.* GUCs in a shape that breaks tenant_id::uuid in RLS.
    await engine.dispose()
    async with engine.connect() as conn:
        await conn.execute(text("SET ROLE forge_app"))
        await conn.execute(
            text("SELECT set_config('app.current_user_id', :u, false)"),
            {"u": str(uuid.uuid4())},
        )
        await conn.execute(
            text("SELECT set_config('app.current_tenant_id', :t, false)"),
            {"t": str(wrong_tenant)},
        )
        r = await conn.execute(text("SELECT count(*)::int FROM pages"))
        n = r.scalar_one()
        assert n == 0
        await conn.execute(text("RESET ROLE"))
