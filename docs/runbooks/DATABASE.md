# Database operations (Postgres)

## Connect

Use Railway’s **Query** tab, `psql` over `DATABASE_URL`, or a tunnel from a trusted machine. Never commit connection strings.

## Migrations

- **Normal:** API container runs `alembic upgrade head` on startup (`apps/api/Dockerfile`).
- **Manual:** `cd apps/api && uv run alembic upgrade head` against the target `DATABASE_URL`.

See [MIGRATIONS.md](./MIGRATIONS.md) for heavy migrations and partman jobs.

## Backup

- **Railway:** enable automated backups for the Postgres plugin; additionally schedule logical dumps to R2/S3 (Mission 08 target: daily `pg_dump`, 30-day retention).
- **Restore:** create a new DB instance or restore snapshot per Railway docs; re-point `DATABASE_URL` only after validation.

## RLS

Tenant tables require **`app.current_org_id`** (canonical, BI-01) and still accept legacy **`app.current_tenant_id`** for older policies — middleware sets both via `set_active_organization`. Internal functions such as `forge_caddy_domain_allowed` use `SECURITY DEFINER` where documented.

Role reference: [DATABASE_ROLES.md](./DATABASE_ROLES.md).
