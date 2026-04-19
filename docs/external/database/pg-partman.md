# pg_partman — Reference for Forge

**Version:** 5.x (PostgreSQL 16 compatible)
**Last researched:** 2026-04-19

## What Forge Uses

pg_partman for automated monthly range partitioning on `analytics_events` and `submissions`. Chosen per ADR-004 for automated partition lifecycle and retention.

## Setup

```sql
-- Install the extension (in Docker, use a PG image with pg_partman pre-installed)
CREATE EXTENSION IF NOT EXISTS pg_partman;
```

## Creating Partitioned Parent Tables

```sql
-- Create the parent table with PARTITION BY RANGE
CREATE TABLE analytics_events (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    page_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
```

## Configuring pg_partman

```sql
-- Tell pg_partman to manage this table
SELECT partman.create_parent(
    p_parent_table := 'public.analytics_events',
    p_control := 'created_at',
    p_interval := '1 month',
    p_premake := 3  -- Create 3 months of future partitions
);

-- Set retention (90 days for analytics)
UPDATE partman.part_config
SET retention = '90 days',
    retention_keep_table = false  -- Drop old partitions, don't just detach
WHERE parent_table = 'public.analytics_events';

-- For submissions (permanent retention)
SELECT partman.create_parent(
    p_parent_table := 'public.submissions',
    p_control := 'created_at',
    p_interval := '1 month',
    p_premake := 3
);
-- No retention set — submissions are kept forever
```

## Maintenance

```sql
-- Run maintenance to create upcoming partitions and drop expired ones
-- Should run hourly via pg_cron or worker job
SELECT partman.run_maintenance();
```

With pg_cron:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('partman-maintenance', '0 * * * *', 'SELECT partman.run_maintenance()');
```

Or via arq worker as a fallback:
```python
async def run_partition_maintenance(ctx):
    async with async_session_factory() as session:
        await session.execute(text("SELECT partman.run_maintenance()"))
        await session.commit()
```

## Docker Image with pg_partman

```yaml
# docker-compose.yml
postgres:
  image: pgpartman/pg_partman:latest  # or build custom
  # Alternative: use postgres:16-alpine and install extension
```

Or custom Dockerfile:
```dockerfile
FROM postgres:16-alpine
RUN apk add --no-cache pg_partman
```

## Known Pitfalls

1. **Extension must be installed**: pg_partman is a PostgreSQL extension, not a Python library.
2. **Parent table has no data**: All rows go to child partitions. Queries on the parent fan out.
3. **Premake**: Set `p_premake` to at least 3 to avoid missing-partition errors if maintenance is delayed.
4. **FKs to partitioned tables**: Foreign keys TO a partitioned table work. Foreign keys FROM a partitioned table are limited.
5. **Indexes on partitions**: Define indexes on the PARENT; they're automatically created on children.

## Links
- [pg_partman GitHub](https://github.com/pgpartman/pg_partman)
- [pg_partman Docs](https://github.com/pgpartman/pg_partman/blob/master/doc/pg_partman.md)
