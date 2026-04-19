# Multi-Tenancy Strategy — Forge

## Three-Layer Isolation

### Layer 1: Application (FastAPI Middleware)
Every authenticated request passes through the Tenant Middleware, which:
1. Extracts the user ID from the Clerk JWT
2. Resolves the active Organization from the user's Memberships
3. Attaches `org_id` and `role` to `request.state`
4. The database session dependency sets `SET LOCAL app.current_tenant_id` for RLS

### Layer 2: Database (PostgreSQL RLS)
Every table with `organization_id` has:
```sql
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
ALTER TABLE {table} FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON {table}
  USING (organization_id::text = current_setting('app.current_tenant_id', true));
```

The application connects as `forge_app` (non-superuser, no BYPASSRLS).

### Layer 3: CI Enforcement
A CI check (`scripts/check_rls.py`) verifies that every table with an `organization_id` column has RLS enabled. This runs on every PR.

## Adding a New Tenant-Scoped Table

When creating a new model with `organization_id`:

1. Add the model extending `TenantMixin`
2. Create an Alembic migration
3. In the migration, add RLS:
```python
op.execute("ALTER TABLE new_table ENABLE ROW LEVEL SECURITY")
op.execute("ALTER TABLE new_table FORCE ROW LEVEL SECURITY")
op.execute("""
    CREATE POLICY tenant_isolation ON new_table
    USING (organization_id::text = current_setting('app.current_tenant_id', true))
""")
```
4. The CI check will catch it if you forget

## Session Variable Pattern

```python
# In get_db dependency
async def get_db(request: Request):
    async with async_session_factory() as session:
        org_id = getattr(request.state, 'org_id', None)
        if org_id:
            await session.execute(
                text("SET LOCAL app.current_tenant_id = :tid"),
                {"tid": str(org_id)}
            )
        yield session
```

`SET LOCAL` scopes the variable to the current transaction. When the transaction ends, the variable is automatically cleared.

## Tables WITHOUT RLS

- `users` — global, users span organizations
- `templates` — global, curated by admin

## Cross-Tenant Access Patterns

- **User listing their orgs**: Query `memberships` where `user_id = current_user`. No org context needed.
- **Switching orgs**: Update the active org in the session. Next request uses new `app.current_tenant_id`.
- **Admin endpoints**: Run as a special admin role with broader access (not yet implemented in MVP).
