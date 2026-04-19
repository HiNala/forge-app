#!/usr/bin/env python3
"""Fail CI if any tenant-scoped table is missing RLS or FORCE RLS."""

from __future__ import annotations

import os
import sys

from sqlalchemy import create_engine, text


def main() -> int:
    url = os.environ.get("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/forge_dev")
    if "+asyncpg" in url:
        url = url.replace("+asyncpg", "+psycopg")
    engine = create_engine(url)
    with engine.connect() as conn:
        rows = conn.execute(
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
        ).fetchall()
        bad: list[str] = []
        for (relname,) in rows:
            flags = conn.execute(
                text(
                    """
                    SELECT c.relrowsecurity, c.relforcerowsecurity
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relname = :t
                    """
                ),
                {"t": relname},
            ).fetchone()
            if flags is None:
                continue
            rls_on, force_on = flags
            if not rls_on or not force_on:
                bad.append(relname)

        org_flags = conn.execute(
            text(
                """
                SELECT c.relrowsecurity, c.relforcerowsecurity
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public' AND c.relname = 'organizations'
                """
            )
        ).fetchone()
        if org_flags is not None:
            o_rls, o_force = org_flags
            if not o_rls or not o_force:
                bad.append("organizations")

    if bad:
        print("RLS/FORCE RLS missing on:", ", ".join(bad), file=sys.stderr)
        return 1
    print("OK:", len(rows), "tenant-scoped tables have RLS + FORCE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
