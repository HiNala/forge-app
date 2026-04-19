# Migrations (Alembic)

## Day-to-day

The API Dockerfile runs **`alembic upgrade head`** before `uvicorn`. Alembic takes an advisory lock so concurrent deploys do not double-apply.

## Long-running changes

For **large table** index creation or backfills:

1. Ship a migration that is **concurrent** where supported (`CREATE INDEX CONCURRENTLY` via raw SQL in a separate migration), or
2. Run a **one-off Railway job** with the migration SQL during a maintenance window, then deploy code that expects the new schema.

## pg_partman / partitions

Analytics and submissions use time partitioning. Schedule partition creation and old-partition drops via the **worker** (arq cron) or Railway cron — see worker `purge_old_analytics` / partman docs.

## Rolling back

See [ROLLBACK.md](./ROLLBACK.md). Prefer **forward** migrations for production fixes.
