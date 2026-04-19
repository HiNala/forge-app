# PostgreSQL 16 — Reference for Forge

**Version:** 16.x
**Last researched:** 2026-04-19

## What Forge Uses

PostgreSQL 16 as the primary database. Key features: JSONB for form schemas and submission payloads, `gen_random_uuid()` for UUID generation, GIN indexes for JSONB queries, CITEXT for case-insensitive email fields, Row-Level Security for tenant isolation, declarative partitioning for high-volume tables.

## JSONB Patterns

```sql
-- Store form schema as JSONB
CREATE TABLE pages (
    form_schema JSONB,
    ...
);

-- Query JSONB fields
SELECT * FROM submissions
WHERE payload->>'email' = 'dan@example.com';

-- GIN index for JSONB containment queries
CREATE INDEX idx_submissions_payload ON submissions USING GIN (payload);

-- Check if JSONB contains a key
SELECT * FROM submissions WHERE payload ? 'phone';
```

## UUID Generation

```sql
-- gen_random_uuid() is built-in to PG 13+, no extension needed
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ...
);
```

## CITEXT for Emails

```sql
-- Enable the extension
CREATE EXTENSION IF NOT EXISTS citext;

-- Use it
CREATE TABLE users (
    email CITEXT UNIQUE NOT NULL
);

-- Now these match automatically:
-- 'Dan@Example.com' = 'dan@example.com'
```

## Useful Index Patterns

```sql
-- Partial index for live pages only
CREATE INDEX idx_pages_live ON pages (organization_id, slug)
WHERE status = 'live';

-- Composite index for submission queries
CREATE INDEX idx_submissions_org_page_date
ON submissions (organization_id, page_id, created_at DESC);

-- GIN index for full-text search on submissions
CREATE INDEX idx_submissions_payload_gin ON submissions USING GIN (payload);
```

## Connection Configuration

```
postgresql+asyncpg://forge:forge@postgres:5432/forge
```

Docker Compose:
```yaml
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: forge
    POSTGRES_PASSWORD: forge
    POSTGRES_DB: forge
  volumes:
    - pgdata:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U forge"]
    interval: 5s
    timeout: 5s
    retries: 5
```

## Known Pitfalls

1. **CITEXT requires extension**: Must `CREATE EXTENSION citext` before creating tables.
2. **JSONB vs JSON**: Always use JSONB (binary, indexable). Never use JSON.
3. **UUID performance**: UUIDs are fine for our scale. If we hit >100M rows per table, consider ULIDs.
4. **`gen_random_uuid()` is built-in**: No need for the `uuid-ossp` extension in PG 13+.

## Links
- [PostgreSQL 16 Docs](https://www.postgresql.org/docs/16/)
- [JSONB Functions](https://www.postgresql.org/docs/16/functions-json.html)
