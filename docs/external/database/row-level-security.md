# Row-Level Security (RLS) — Reference for Forge

**Version:** PostgreSQL 16
**Last researched:** 2026-04-19

## What Forge Uses

RLS is the database-level safety net for multi-tenant isolation. Every table with `organization_id` has an RLS policy. The FastAPI middleware sets a session variable `app.current_tenant_id` on each request. Even if application code forgets a `.where(org_id=...)`, RLS prevents cross-tenant data leaks.

## Setup Pattern

### 1. Create a Non-Superuser Role

```sql
-- Run as superuser during setup
CREATE ROLE forge_app LOGIN PASSWORD 'forge_app_password';
GRANT CONNECT ON DATABASE forge TO forge_app;
GRANT USAGE ON SCHEMA public TO forge_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO forge_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO forge_app;

-- Important: this role does NOT have BYPASSRLS
-- So RLS policies are enforced
```

### 2. Enable RLS on Every Tenant Table

```sql
-- Template for every tenant-scoped table
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON pages
    USING (organization_id::text = current_setting('app.current_tenant_id', true));
```

The `true` parameter in `current_setting()` means "return NULL if the setting doesn't exist" instead of raising an error. This means any query without the session variable set returns 0 rows — fail-closed.

### 3. Apply to All Tenant Tables

```sql
-- List of all tables requiring RLS:
-- memberships, invitations, brand_kits, pages, page_versions, page_revisions,
-- conversations, messages, submissions, submission_files, submission_replies,
-- automation_rules, calendar_connections, automation_runs, analytics_events,
-- subscription_usage

-- Apply the same pattern to each
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'memberships', 'invitations', 'brand_kits', 'pages', 'page_versions',
        'page_revisions', 'conversations', 'messages', 'submission_files',
        'submission_replies', 'automation_rules', 'calendar_connections',
        'automation_runs', 'subscription_usage'
    ]) LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I USING (organization_id::text = current_setting(''app.current_tenant_id'', true))',
            tbl
        );
    END LOOP;
END $$;
```

### 4. Partitioned Tables Need Special Handling

```sql
-- For partitioned tables (submissions, analytics_events),
-- RLS must be applied to the PARENT table.
-- Child partitions inherit the policy.
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON submissions
    USING (organization_id::text = current_setting('app.current_tenant_id', true));
```

## FastAPI Integration

```python
# In the database session dependency
async def get_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        # Set the tenant context for RLS
        org_id = getattr(request.state, 'org_id', None)
        if org_id:
            await session.execute(
                text("SET LOCAL app.current_tenant_id = :tid"),
                {"tid": str(org_id)}
            )
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

## CI Check Script

```python
# scripts/check-rls.py
"""CI check: ensure every table with organization_id has RLS enabled."""
import asyncio
from sqlalchemy import text
from app.db.session import engine

async def check_rls():
    async with engine.connect() as conn:
        # Find tables with organization_id column
        result = await conn.execute(text("""
            SELECT table_name FROM information_schema.columns
            WHERE column_name = 'organization_id'
            AND table_schema = 'public'
        """))
        tables_with_org = {row[0] for row in result}

        # Find tables with RLS enabled
        result = await conn.execute(text("""
            SELECT relname FROM pg_class
            WHERE relrowsecurity = true
            AND relnamespace = 'public'::regnamespace
        """))
        tables_with_rls = {row[0] for row in result}

        # Check
        missing = tables_with_org - tables_with_rls
        if missing:
            print(f"FAIL: Tables missing RLS: {missing}")
            exit(1)
        print(f"PASS: All {len(tables_with_org)} tenant tables have RLS enabled")

asyncio.run(check_rls())
```

## Known Pitfalls

1. **`FORCE ROW LEVEL SECURITY`**: Without this, the table owner bypasses RLS. Always include it.
2. **Superuser bypasses RLS**: The application must connect as a non-superuser role (`forge_app`).
3. **`SET LOCAL`**: Use `SET LOCAL` (not `SET`) so the variable is scoped to the transaction, not the session.
4. **Migrations run as superuser**: RLS doesn't apply during migrations. This is correct — migrations operate on all tenants.
5. **Users table has NO RLS**: Users are global (they belong to orgs via Membership). No `organization_id`.

## Links
- [PostgreSQL RLS Docs](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
