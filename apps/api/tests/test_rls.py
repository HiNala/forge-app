"""RLS policy presence + ``forge_app`` isolation (Mission 01, BI-01)."""

from __future__ import annotations

import os
import uuid

import pytest
import sqlalchemy as sa
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from tests.support.postgres import require_postgres


def _forge_url() -> str:
    base = os.environ.get(
        "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/forge_dev"
    )
    if "+asyncpg" in base:
        base = base.replace("+asyncpg", "+psycopg")
    _scheme, rest = base.split("://", 1)
    hostpart = rest.split("@", 1)[1]
    return f"{_scheme}://forge_app:forge_app_dev_change_me@{hostpart}"


def _admin_url() -> str:
    u = str(settings.DATABASE_URL)
    if "+asyncpg" in u:
        u = u.replace("+asyncpg", "+psycopg")
    return u


def _set_user_only(conn) -> None:
    conn.execute(
        text("SELECT set_config('app.current_user_id', :u, false)"),
        {"u": str(uuid.uuid4())},
    )


def _set_user_org_context(
    conn: Connection, *, org: uuid.UUID, user: uuid.UUID | None = None
) -> None:
    uid = str(user) if user is not None else str(uuid.uuid4())
    oid = str(org)
    conn.execute(text("SELECT set_config('app.current_user_id', :u, false)"), {"u": uid})
    conn.execute(text("SELECT set_config('app.current_org_id', :t, false)"), {"t": oid})
    conn.execute(text("SELECT set_config('app.current_tenant_id', :t, false)"), {"t": oid})


@pytest.mark.asyncio
async def test_rls_policies_exist() -> None:
    await require_postgres()
    engine = create_async_engine(str(settings.DATABASE_URL))
    async with engine.connect() as conn:
        q = (
            "SELECT COUNT(*) FROM pg_policies "
            "WHERE tablename = 'pages' AND policyname = 'forge_tenant_isolation'"
        )
        r = await conn.execute(text(q))
        row = r.scalar_one()
        assert row == 1
    await engine.dispose()


@pytest.mark.asyncio
async def test_forge_app_sees_no_pages_for_foreign_tenant() -> None:
    """Wrong tenant GUCs → zero ``pages`` rows for ``forge_app``."""
    await require_postgres()
    wrong_tenant = uuid.uuid4()
    eng = create_engine(_forge_url())
    with eng.connect() as conn:
        _set_user_org_context(conn, org=wrong_tenant)
        n = conn.execute(text("SELECT count(*)::int FROM pages")).scalar_one()
        assert n == 0
    eng.dispose()


@pytest.mark.asyncio
async def test_forge_app_without_tenant_context_sees_no_pages() -> None:
    """No org GUC → zero rows (policies require tenant context)."""
    await require_postgres()
    eng = create_engine(_forge_url())
    with eng.connect() as conn:
        _set_user_only(conn)
        n = conn.execute(text("SELECT count(*)::int FROM pages")).scalar_one()
        assert n == 0
    eng.dispose()


@pytest.mark.asyncio
async def test_forge_app_cross_tenant_insert_and_update_blocked() -> None:
    """WITH CHECK blocks inserting or moving rows into another organization."""
    await require_postgres()
    org_a = uuid.uuid4()
    org_b = uuid.uuid4()
    slug_a = f"rls-a-{org_a.hex[:10]}"
    slug_b = f"rls-b-{org_b.hex[:10]}"
    admin = create_engine(_admin_url())
    forge = create_engine(_forge_url())
    try:
        with admin.begin() as conn:
            conn.execute(
                text("INSERT INTO organizations (id, slug, name) VALUES (:id, :slug, :name)"),
                {"id": org_a, "slug": slug_a, "name": "RLS Org A"},
            )
            conn.execute(
                text("INSERT INTO organizations (id, slug, name) VALUES (:id, :slug, :name)"),
                {"id": org_b, "slug": slug_b, "name": "RLS Org B"},
            )
        with forge.connect() as conn:
            _set_user_org_context(conn, org=org_a)
            with pytest.raises(sa.exc.DBAPIError):
                conn.execute(
                    text(
                        """
                        INSERT INTO pages (organization_id, slug, page_type, title, current_html)
                        VALUES (:org, :sl, 'landing', 't', '')
                        """
                    ),
                    {"org": org_b, "sl": f"x1-{uuid.uuid4().hex[:8]}"},
                )
        page_id = uuid.uuid4()
        with admin.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO pages (id, organization_id, slug, page_type, title, current_html)
                    VALUES (:id, :org, :sl, 'landing', 't', '')
                    """
                ),
                {"id": page_id, "org": org_a, "sl": f"x2-{uuid.uuid4().hex[:8]}"},
            )
        with forge.connect() as conn:
            _set_user_org_context(conn, org=org_a)
            with pytest.raises(sa.exc.DBAPIError):
                conn.execute(
                    text(
                        "UPDATE pages SET organization_id = CAST(:b AS uuid) "
                        "WHERE id = CAST(:id AS uuid)"
                    ),
                    {"b": str(org_b), "id": str(page_id)},
                )
    finally:
        with admin.begin() as conn:
            conn.execute(
                text("DELETE FROM organizations WHERE id IN (:a, :b)"),
                {"a": org_a, "b": org_b},
            )
        admin.dispose()
        forge.dispose()


@pytest.mark.asyncio
async def test_forge_app_sees_only_rows_for_active_org() -> None:
    await require_postgres()
    org_a = uuid.uuid4()
    org_b = uuid.uuid4()
    slug_a = f"rls2-a-{org_a.hex[:10]}"
    slug_b = f"rls2-b-{org_b.hex[:10]}"
    page_b = uuid.uuid4()
    admin = create_engine(_admin_url())
    try:
        with admin.begin() as conn:
            conn.execute(
                text("INSERT INTO organizations (id, slug, name) VALUES (:id, :slug, :name)"),
                {"id": org_a, "slug": slug_a, "name": "RLS2 A"},
            )
            conn.execute(
                text("INSERT INTO organizations (id, slug, name) VALUES (:id, :slug, :name)"),
                {"id": org_b, "slug": slug_b, "name": "RLS2 B"},
            )
            conn.execute(
                text(
                    """
                    INSERT INTO pages (id, organization_id, slug, page_type, title, current_html)
                    VALUES (:id, :org, :sl, 'landing', 't', '')
                    """
                ),
                {"id": page_b, "org": org_b, "sl": f"only-b-{page_b.hex[:8]}"},
            )
        eng = create_engine(_forge_url())
        with eng.connect() as conn:
            _set_user_org_context(conn, org=org_a)
            n = conn.execute(text("SELECT count(*)::int FROM pages")).scalar_one()
            assert n == 0
        eng.dispose()
    finally:
        with admin.begin() as conn:
            conn.execute(
                text("DELETE FROM organizations WHERE id IN (:a, :b)"),
                {"a": org_a, "b": org_b},
            )
        admin.dispose()
