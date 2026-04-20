# Production deployment (Railway)

## Preconditions

- CI green on `main` (`lint`, `typecheck`, `pytest`, RLS check).
- Migrations reviewed; long-running DDL planned per [MIGRATIONS.md](./MIGRATIONS.md).
- Secrets set in Railway (never in git) — see [ENVIRONMENTS.md](./ENVIRONMENTS.md).

## Services

Build from Dockerfiles:

| Service | Build context | Dockerfile | Start |
|---------|---------------|------------|--------|
| web | **repo root** | `apps/web/Dockerfile` | Next standalone (`node apps/web/server.js`) |
| api | `apps/api` | `Dockerfile` | Uvicorn on `$PORT` (migrations **not** on boot — GL-04) |
| worker | **repo root** | `apps/worker/Dockerfile` | `arq worker.WorkerSettings` |
| caddy | `infra/caddy` | `Dockerfile` | Caddy |

Use **private networking** between services (`*.railway.internal`).

## First deploy

1. Provision Postgres 16 + Redis 7 (Railway plugins).
2. Set env vars per environment ([ENV_MANIFEST.md](../deployment/ENV_MANIFEST.md)).
3. Deploy **api**, then run migrations explicitly: `railway run --service api uv run alembic upgrade head` (or equivalent).
4. Deploy **worker** and **web**.
5. Attach public domain to **Caddy** (or web directly if not using custom domains yet).
6. Run smoke tests: `/health/live`, `/health/ready`, sign-in, Studio (staging first).

See [RAILWAY_SETUP.md](../deployment/RAILWAY_SETUP.md) for CLI and topology.

## DNS (production)

See Mission 08 checklist: `forge.app`, `api.forge.app`, wildcard `*.forge.app`, `staging.forge.app`, `status.*` per provider.

## Caddy + TLS

- Configure `on_demand_tls` `ask` URL to hit **`GET /internal/caddy/validate?domain=`** on the API (private URL).
- Optional: set `CADDY_INTERNAL_TOKEN` and send `X-Forge-Caddy-Token` from Caddy.

Reference: `infra/caddy/Caddyfile`, `docs/external/infrastructure/caddy-reverse-proxy.md`.
