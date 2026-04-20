# Railway setup (GL-04)

End-to-end provisioning uses the **Railway CLI** with `RAILWAY_TOKEN` (browserless login). This doc matches Forge’s layout; actual IDs and hostnames come from your Railway project.

## Topology

- **api** — `apps/api` Docker image; FastAPI on `$PORT`; health `GET /health/ready`.
- **worker** — build from repo root, `apps/worker/Dockerfile`; **arq** (`worker.WorkerSettings`). Same Redis/DB env as api.
- **web** — build from repo root, `apps/web/Dockerfile`; **`NEXT_PUBLIC_*` build args** must match public URLs for that environment.
- **caddy** — `infra/caddy`; reverse proxy + on-demand TLS (see `infra/caddy/Caddyfile`).
- **Plugins:** Postgres 16 (`pgcrypto`, `btree_gist`; `pg_partman` when available — see `PARTITIONING.md`), Redis 7.

Set **Root Directory** in Railway:

| Service | Root directory | Dockerfile path (from root) |
|---------|----------------|-----------------------------|
| api | `apps/api` | `Dockerfile` |
| worker | *(repo root)* | `apps/worker/Dockerfile` |
| web | *(repo root)* | `apps/web/Dockerfile` |
| caddy | `infra/caddy` | `Dockerfile` |

`railway.json` files in this repo mirror the above; align Railway UI if the platform does not auto-detect them.

## CLI bootstrap

```bash
curl -fsSL https://railway.app/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
export RAILWAY_TOKEN="..."   # from Railway account
railway login --browserless
railway init
railway environment new production
railway environment new staging
```

Link GitHub for **GitHub-based builds** (recommended). Use `railway up` only as a fallback when Git is unavailable.

## Database

Migrations **do not** run on API container boot in production (`apps/api/Dockerfile`). Apply explicitly:

```bash
railway environment use staging
railway run --service api uv run alembic upgrade head
```

Extensions (via `railway connect postgres` → `psql`):

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_partman;
```

If `pg_partman` is missing on the managed instance, keep monthly partitions via the process in `docs/architecture/PARTITIONING.md` and `app/db/partitioning.py` (maintenance job / fallback — evolve with BI tooling).

## Environment variables

Shared variables at **environment** scope; DB/Redis via references:

```text
DATABASE_URL=${{postgres.DATABASE_URL}}
REDIS_URL=${{redis.REDIS_URL}}
```

Full list: [ENV_MANIFEST.md](./ENV_MANIFEST.md). Audit:

```bash
./scripts/deployment/audit_env.sh staging
```

## CI/CD

Existing workflows: `.github/workflows/ci.yml` (tests), `.github/workflows/deploy-railway.yml` (optional Railway deploy when secrets are set). Extend per GL-04 Phase 12 (staging auto, production gated).

## DNS

See [DNS_SETUP.md](./DNS_SETUP.md).
