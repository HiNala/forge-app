"""Regression: tenant-scoped tables must keep RLS + FORCE enabled (BI-01).

Mission BI-01 names this module as the guardrail; keep in sync with ``scripts/check-rls.py``.
"""

from __future__ import annotations

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from tests.support.postgres import require_postgres


@pytest.mark.asyncio
async def test_organization_id_tables_have_rls_and_force() -> None:
    await require_postgres()
    engine = create_async_engine(str(settings.DATABASE_URL))
    async with engine.connect() as conn:
        rows = (
            await conn.execute(
                text(
                    """
                    SELECT c.relname
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    JOIN information_schema.columns col
                      ON col.table_schema = n.nspname AND col.table_name = c.relname
                    WHERE n.nspname = 'public'
                      AND c.relkind = 'r'
                      AND col.column_name = 'organization_id'
                      AND c.relname NOT LIKE 'template_public_%'
                      AND NOT EXISTS (
                        SELECT 1 FROM pg_inherits i WHERE i.inhrelid = c.oid
                      )
                    ORDER BY c.relname
                    """
                )
            )
        ).fetchall()
        missing: list[str] = []
        for (relname,) in rows:
            flags = (
                await conn.execute(
                    text(
                        """
                        SELECT c.relrowsecurity, c.relforcerowsecurity
                        FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE n.nspname = 'public' AND c.relname = :t
                        """
                    ),
                    {"t": relname},
                )
            ).fetchone()
            assert flags is not None
            if not flags[0] or not flags[1]:
                missing.append(relname)
        org = (
            await conn.execute(
                text(
                    """
                    SELECT c.relrowsecurity, c.relforcerowsecurity
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relname = 'organizations'
                    """
                )
            )
        ).fetchone()
        assert org is not None
        if not org[0] or not org[1]:
            missing.append("organizations")
        assert not missing, f"RLS/FORCE missing: {missing}"
    await engine.dispose()
