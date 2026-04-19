"""Verify RLS policies exist on tenant tables (Mission 01)."""

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings


@pytest.mark.asyncio
async def test_rls_policies_exist():
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
