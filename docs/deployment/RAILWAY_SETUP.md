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

Templates: `apps/api/railway.json`, `apps/web/railway.json`, `infra/caddy/railway.json`, and **`infra/railway.worker.json`** for the worker (service root = repo root). Do not add a `railway.json` under `apps/worker/` with a wrong Dockerfile path.

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

- `.github/workflows/ci.yml` — lint, typecheck, API tests, RLS check.
- `.github/workflows/deploy-staging.yml` — `workflow_dispatch` and (on push to `main`, filtered paths) optional `railway up` when `RAILWAY_TOKEN` and `RAILWAY_SERVICE_ID_STAGING` are set. If both secrets are set, a non-zero `railway up` **fails the job** (fix CLI project link or prefer Railway’s GitHub integration). If either secret is missing, the CLI step is skipped.
- `.github/workflows/deploy-production.yml` — manual `workflow_dispatch` with confirmation input; uses `RAILWAY_SERVICE_ID_PRODUCTION` and GitHub Environment `production` (add required reviewers there).

Secrets: `RAILWAY_TOKEN`, `RAILWAY_SERVICE_ID_STAGING`, `RAILWAY_SERVICE_ID_PRODUCTION`, optional `STAGING_BASE_URL` / `PRODUCTION_BASE_URL` for post-deploy `curl` smoke.

## DNS

See [DNS_SETUP.md](./DNS_SETUP.md).
