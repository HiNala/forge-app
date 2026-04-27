# Forge — mini-app platform

Forge is the fastest way to ship a **mini-app**: a form, landing page, proposal, pitch deck, website idea, or (on the roadmap) mobile and web canvas outputs. Describe it in the Studio, share a link, see analytics, export when the work moves elsewhere — you never run a database for it.

## What’s in this repo

| Area | Path | Role |
|------|------|------|
| **Web** | `apps/web` | Next.js App Router UI (marketing, dashboard, Studio, settings). |
| **API** | `apps/api` | FastAPI app: auth, orgs, pages, AI orchestration, webhooks. |
| **Worker** | `apps/worker` | [arq](https://arq-docs.helpmanual.io/) Redis-backed jobs (exports, async work). |
| **Packages** | `packages/` | Shared ESLint/TS config. |
| **Docs** | `docs/` | Architecture, runbooks, missions, external references. |
| **Infra** | `infra/` | Caddy, Railway-oriented snippets (production TLS / routing). |

## Prerequisites

| Tool | Version | Notes |
|------|---------|--------|
| **Node.js** | ≥ 20 | Used by web and root `pnpm` scripts. |
| **pnpm** | 9.x (via Corepack) | Monorepo installs; Docker web service enables Corepack. |
| **Docker Desktop** (or Engine + Compose) | Current | Full stack: `docker compose`. |
| **Python / uv** | 3.12 / latest | Only if you run the API or worker **outside** Docker. |

Optional: **PostgreSQL client**, **curl**, **Git**.

## First-time setup

```bash
git clone https://github.com/HiNala/forge-app.git
cd forge-app
cp .env.example .env
```

Edit `.env` before starting anything that reads it:

1. **Clerk** — `CLERK_JWKS_URL`, `CLERK_JWT_ISSUER`, `CLERK_AUDIENCE` (and webhook secret if you use webhooks). Required for browser sign-in and API JWT validation.
2. **LLM** — At least `OPENAI_API_KEY` (or other provider keys) for live Studio generation and orchestration.
3. **Secrets** — Set `SECRET_KEY` to a long random string (e.g. `openssl rand -hex 32`).

All variable names and categories match `apps/api/app/config.py`. **Never commit `.env`.** The canonical template is **`.env.example`**.

### URLs: local web on port 3000 vs Docker on 3001

- **`.env.example`** defaults `NEXT_PUBLIC_APP_URL` / `APP_PUBLIC_URL` to `http://localhost:3000` (local `pnpm dev`).
- **`docker-compose.yml`** overrides the **web** container with `NEXT_PUBLIC_APP_URL=http://localhost:3001` and `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` so the browser talks to the mapped host ports. You do not need to duplicate those in `.env` for Compose unless you remove the `environment:` block.

---

## Docker Compose — full stack (recommended for parity)

Compose file: **`docker-compose.yml`**. It runs **web**, **api**, **worker**, **postgres**, **redis**, and **minio**. There is **no Caddy** in this file; TLS and production routing live under `infra/` and hosting (e.g. Railway).

### Start

From the **repository root**:

```bash
docker compose up --build -d
```

- **API** runs Alembic **`alembic upgrade head`** on startup, then **uvicorn** with `--reload` (dev-friendly).
- **Web** uses a bind mount of the repo plus **named volumes** for `node_modules` (avoids broken `node_modules` when the repo is on Windows/macOS and the container is Linux).

### Service map

| Service | Host URL / port | Purpose |
|---------|------------------|---------|
| **web** | **http://localhost:3001** | Next.js dev server inside the container (`3001` → container `3000`). |
| **api** | http://localhost:8000 | REST + OpenAPI at **`/docs`**, **`/redoc`**. |
| **Health** | http://localhost:8000/health | Liveness. |
| **Deep health** | http://localhost:8000/health/deep | Postgres + Redis checks. |
| **worker** | (no public port) | Consumes Redis queue; shares DB URL with API. |
| **postgres** | localhost:**5432** | DB `forge_dev`, user/password `postgres`/`postgres`. Image includes **pg_partman** (see `docs/architecture/PARTITIONING.md`). |
| **redis** | localhost:**6379** | Queue + cache. |
| **minio** | API **9000**, console **9001** | S3-compatible storage; default keys `minioadmin` / `minioadmin`. Align `S3_*` and `PUBLIC_ASSET_BASE_URL` in `.env`. |

### Common Compose commands

```bash
# Logs (all services)
docker compose logs -f

# One service
docker compose logs -f api

# Stop containers (keep volumes)
docker compose down

# Stop and remove named volumes (Postgres, Redis, MinIO, web node_modules caches)
docker compose down -v

# Rebuild images after Dockerfile or dependency changes
docker compose build --no-cache api worker
docker compose up -d
```

### Seed demo data (idempotent)

```bash
docker compose exec api uv run python scripts/seed_dev.py
```

### Tests inside running containers

```bash
docker compose exec api uv run pytest
docker compose exec web sh -c "corepack enable && corepack prepare pnpm@9 --activate && pnpm install && pnpm --filter web test"
```

### Other Compose files

| File | Use |
|------|-----|
| `docker-compose.prod.yml` | Smoke **production Docker builds** locally (`ENVIRONMENT=development` for API so strict prod validation does not apply). Not the default dev workflow. |
| `docker-compose.ci.yml` | CI-oriented overrides (see repo workflows). |

---

## Local development without Docker (web on host)

Useful when you want the fastest Next.js HMR on the host and only run data services in Docker.

1. Start **infra only** (example — adjust service list to match your needs):

   ```bash
   docker compose up -d postgres redis minio
   ```

2. From repo root:

   ```bash
   pnpm install
   pnpm dev
   ```

- **Web:** http://localhost:3000  
- Point **`NEXT_PUBLIC_API_URL`** in `.env` at your API, e.g. `http://localhost:8000/api/v1`.

Run the API on the host from `apps/api` (see `apps/api/pyproject.toml`): typically `uv run uvicorn app.main:app --reload --port 8000`.

---

## Smoke checks after boot

1. **Marketing:** http://localhost:3001 (Docker) or http://localhost:3000 (local `pnpm dev`) — landing page loads.
2. **App shell:** http://localhost:3001/dashboard — redirects to Clerk **sign-in** when unauthenticated (authenticated UI lives under the Next.js `(app)` **route group**; URLs are `/dashboard`, `/settings`, … — not a literal `/app` prefix).
3. **API:** `curl -s http://localhost:8000/health` → JSON with healthy status.
4. **Deep health:** `curl -s http://localhost:8000/health/deep` → DB + Redis OK when configured.
5. **Quick script (optional):** `pwsh -File scripts/verify_local_stack.ps1` — hits `/health` and the marketing URL on `:3001`.

### Going live on the internet

Set `ENVIRONMENT=production` only on real deploys: the API **refuses to boot** with weak `SECRET_KEY`, wildcard `TRUSTED_HOSTS`, missing Clerk config, non-HTTPS public URLs/CORS, or `AUTH_TEST_BYPASS` / `FORGE_E2E_TOKEN` enabled. Use **`METRICS_TOKEN`** for Prometheus, **`TRUST_PROXY_HEADERS=true`** behind your load balancer, and rotate secrets per environment. Full checklist: **`docs/runbooks/GO_LIVE_PLAYBOOK.md`** and **`docs/runbooks/LAUNCH_READINESS.md`**.

---

## Product flows (high level)

### Signup → onboarding → brand

1. **Sign up** with Clerk (`/signup`); the app calls `POST /api/v1/auth/signup` to create the Forge **User**, default **Organization**, and **Owner** membership.
2. **Onboarding** at **`/onboarding`** — workspace name, primary color, optional logo (skippable); see `OnboardingGate` + `sessionStorage` per org.
3. **Brand** under **Settings → Brand** (`/settings/brand`); API persists **BrandKit** and optional logo to S3-compatible storage.

The browser sends **`Authorization: Bearer`** (Clerk JWT) and **`x-forge-active-org-id`** on API calls; Postgres **RLS** enforces tenant isolation. See **`docs/runbooks/TENANT_ISOLATION.md`**.

### Studio (AI generation)

1. Open **Studio** (`/studio`), enter a prompt, **Generate**.
2. The API streams **SSE** (e.g. intent → HTML chunks → completion); preview updates in an iframe.
3. **Refine** with follow-up messages or **Edit mode** for section-level changes. Requires LLM keys in `.env`.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 async |
| Database | PostgreSQL 16 (RLS), Redis 7 |
| Storage | MinIO (local) / S3 (production) |
| AI | OpenAI, Anthropic, Google Gemini (router in API) |
| Email | Resend |
| Billing | Stripe |
| Deploy | Docker, Railway (see `docs/deployment/`) |

---

## Repository layout

```
forge-app/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api/          # FastAPI backend (Alembic migrations in alembic/)
│   └── worker/       # arq worker (Redis)
├── packages/         # eslint-config, shared tooling
├── docs/             # Architecture, runbooks, ADRs, missions
├── infra/            # Caddy, production snippets
├── load/             # Load-test assets (e.g. k6)
├── docker-compose.yml
├── docker-compose.prod.yml
└── docker-compose.ci.yml
```

---

## Environment variables (overview)

The full list and comments live in **`.env.example`**. Highlights:

| Area | Variables (examples) |
|------|----------------------|
| Web (public) | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, Clerk public keys as needed |
| Core | `ENVIRONMENT`, `SECRET_KEY`, `DATABASE_URL`, `REDIS_URL` |
| HTTP | `BACKEND_CORS_ORIGINS`, `TRUSTED_HOSTS`, `TRUST_PROXY_HEADERS` |
| Clerk | `CLERK_JWKS_URL`, `CLERK_JWT_ISSUER`, `CLERK_AUDIENCE`, `CLERK_WEBHOOK_SECRET` |
| Storage | `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `PUBLIC_ASSET_BASE_URL` |
| LLM | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `LLM_DEFAULT_PROVIDER`, model overrides |
| Email / Stripe / OAuth | `RESEND_*`, `STRIPE_*`, `GOOGLE_OAUTH_*` |
| Ops | `SENTRY_DSN`, `POSTHOG_*`, `FORGE_OPERATOR_ORG_IDS` |

Compose **overrides** `DATABASE_URL`, `REDIS_URL`, and CORS-related URLs for `api` / `worker` so services use Docker network hostnames (`postgres`, `redis`).

---

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| **Web container fails or empty `node_modules`** | Named volumes `web_root_node_modules` / `web_app_node_modules` hold Linux deps; run `docker compose down -v` and `docker compose up --build` to reset. On Windows, avoid bind-mounting host `node_modules` into Linux — the compose file uses volumes intentionally. |
| **Port already in use (3001, 8000, 5432, …)** | Stop other Postgres/Redis/Next processes or change host ports in `docker-compose.yml`. |
| **API 401 / Clerk errors** | JWKS URL, issuer, audience must match the Clerk dashboard and your frontend URL. |
| **Studio / LLM errors** | `OPENAI_API_KEY` (or chosen provider) set in `.env` and visible to the **api** container (`env_file: .env`). |
| **MinIO uploads** | **`docker-compose.yml`** sets `S3_ENDPOINT=http://minio:9000` for **api** and **worker** so the SDK hits MinIO on the Compose network. Browsers still use `PUBLIC_ASSET_BASE_URL` (typically `http://localhost:9000/...` on the host). |
| **Migrations failed** | Read `docker compose logs api`; fix DB state; re-run `docker compose exec api uv run alembic upgrade head`. |

Worker-specific behavior: **`docs/runbooks/WORKER.md`**.

---

## Documentation index

| Topic | Location |
|-------|----------|
| Tenant isolation / RLS | `docs/runbooks/TENANT_ISOLATION.md` |
| Request pipeline | `docs/architecture/REQUEST_PIPELINE.md` |
| LLM orchestration | `docs/architecture/LLM_ORCHESTRATION.md` |
| API overview | `docs/architecture/API_OVERVIEW.md` |
| Debugging requests | `docs/runbooks/DEBUGGING_REQUESTS.md` |
| LLM debugging | `docs/runbooks/LLM_DEBUGGING.md` |
| Database | `docs/runbooks/DATABASE.md` |
| Go-live | `docs/runbooks/GO_LIVE_PLAYBOOK.md` |
| Environments | `docs/runbooks/ENVIRONMENTS.md` |
| **Pricing (V2 model)** | `docs/billing/PRICING_MODEL.md` — Free / Pro / Max 5x / Max 20x, Forge Credits, session + weekly windows |

---

## Pricing (summary)

Self-serve tiers: **Free** ($0), **Pro** ($20/mo, $200/yr), **Max 5x** ($100/mo, $1,000/yr), **Max 20x** ($200/mo, $2,000/yr). Usage is metered in **Forge Credits** with a rolling **5-hour session** pool and a **7-day weekly** cap; see the marketing **Pricing** page and `docs/billing/PRICING_MODEL.md` for the full table (published mini-apps, submissions, seats, overage, etc.).

---

## Root scripts

```bash
pnpm dev          # Next.js dev (apps/web)
pnpm build        # pnpm -r build
pnpm test         # pnpm -r test
pnpm lint         # pnpm -r lint
pnpm typecheck    # pnpm -r typecheck
```

---

## License

Proprietary — Digital Studio Labs
