# Partitioning Strategy — Forge

## Partitioned Tables

### analytics_events
- **Partition by:** `RANGE (created_at)` monthly
- **Retention:** 90 days (configurable per plan tier)
- **Rationale:** High write volume (page views, clicks), query pattern is always time-bounded

### submissions
- **Partition by:** `RANGE (created_at)` monthly
- **Retention:** Permanent (users expect their submission data forever)
- **Rationale:** Moderate write volume, queries filter by page + time range

## pg_partman Configuration

```sql
-- Analytics events (90-day retention)
SELECT partman.create_parent(
    p_parent_table := 'public.analytics_events',
    p_control := 'created_at',
    p_interval := '1 month',
    p_premake := 3
);

UPDATE partman.part_config
SET retention = '90 days',
    retention_keep_table = false
WHERE parent_table = 'public.analytics_events';

-- Submissions (no retention)
SELECT partman.create_parent(
    p_parent_table := 'public.submissions',
    p_control := 'created_at',
    p_interval := '1 month',
    p_premake := 3
);
```

## Maintenance Schedule

pg_partman maintenance runs hourly to:
- Create future partitions (keeps 3 months ahead)
- Drop expired analytics partitions
- Log partition count and sizes

Run via `pg_cron` or as a backup via the arq worker.

## Migration Coordination

1. Initial migration creates parent tables with `PARTITION BY RANGE (created_at)`
2. A post-migration script calls `partman.create_parent()` to set up automationl
3. Alembic autogenerate does NOT handle partition management — hand-write these migrations

## Composite Primary Keys

Partitioned tables require the partition key in the primary key:
```sql
PRIMARY KEY (id, created_at)
```

This means foreign keys TO partitioned tables are restricted. We use application-level referential integrity for `submission_id` in `submission_files` and `submission_replies`.

## Query Patterns

Always include `created_at` in queries on partitioned tables to enable partition pruning:
```sql
-- Good: prunes to 1-2 partitions
SELECT * FROM submissions
WHERE organization_id = $1 AND page_id = $2 AND created_at > NOW() - INTERVAL '30 days';

-- Bad: scans all partitions
SELECT * FROM submissions WHERE organization_id = $1 AND page_id = $2;
```
