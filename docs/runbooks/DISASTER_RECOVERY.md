# Disaster recovery (GL-04)

## Postgres

1. **Railway automated backups:** enable daily backups with retention matching your compliance needs.
2. **Logical dumps:** schedule `pg_dump` (custom format) to object storage (e.g. R2) weekly; test restore quarterly.
3. **Restore:** create a new Railway Postgres or restore snapshot per Railway docs; run `alembic upgrade head` if schema drift; point `DATABASE_URL` and validate RLS with `scripts/check-rls.py`.

## Redis

- Redis holds caches and rate-limit counters. Loss implies cold cache and reset rate limits — **acceptable**; no user data recovery required.

## Object storage (R2 / S3)

- Enable versioning or cross-region replication for the production bucket if required by contract.
- Page HTML also lives in Postgres (`page_versions`); prioritize DB restore for content integrity.

## Railway platform outage

- Keep runbook notes for a secondary provider (Render, Fly.io) at a high level: export Docker images, same env vars, attach Postgres/Redis.
- Full migration is **not** rehearsed in GL-04; document contacts and rough cutover order only.

## Verification after restore

- `/health/ready` returns 200.
- Sign-in and tenant isolation spot-check (`tests/test_rls_via_http.py` patterns).
