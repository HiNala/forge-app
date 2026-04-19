# Production deployment (Railway)

## Preconditions

- CI green on `main` (`lint`, `typecheck`, `pytest`, RLS check).
- Migrations reviewed; long-running DDL planned per [MIGRATIONS.md](./MIGRATIONS.md).
- Secrets set in Railway (never in git) — see [ENVIRONMENTS.md](./ENVIRONMENTS.md).

## Services

Build from Dockerfiles:

| Service | Path | Default start |
|---------|------|----------------|
| web | `apps/web/Dockerfile` | `node` standalone |
| api | `apps/api/Dockerfile` | `alembic upgrade head && uvicorn …` |
| worker | `apps/worker/Dockerfile` | arq worker |
| caddy | `infra/caddy/Dockerfile` | Caddy (custom domains) |

Use **private networking** between services (`*.railway.internal`).

## First deploy

1. Provision Postgres 16 + Redis 7 (Railway plugins).
2. Set env vars per environment.
3. Deploy **api** — migrations run on startup (`Dockerfile` CMD).
4. Deploy **worker** and **web**.
5. Attach public domain to **Caddy** (or web directly if not using custom domains yet).
6. Run smoke tests: `/health`, `/health/deep`, sign-in, Studio generate (staging first).

## DNS (production)

See Mission 08 checklist: `forge.app`, `api.forge.app`, wildcard `*.forge.app`, `staging.forge.app`, `status.*` per provider.

## Caddy + TLS

- Configure `on_demand_tls` `ask` URL to hit **`GET /internal/caddy/validate?domain=`** on the API (private URL).
- Optional: set `CADDY_INTERNAL_TOKEN` and send `X-Forge-Caddy-Token` from Caddy.

Reference: `infra/caddy/Caddyfile`, `docs/external/infrastructure/caddy-reverse-proxy.md`.
