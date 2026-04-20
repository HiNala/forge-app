# Forge — AI-Powered Mini-App Builder

Forge turns a plain-English prompt into a finished, hosted, single-purpose web page — a booking form, a contact form, an event RSVP, a daily menu, a sales proposal — and gives the creator an admin surface to manage it afterward.

## Quick Start

```bash
git clone https://github.com/HiNala/forge-app.git
cd forge-app
cp .env.example .env
# Edit .env: Clerk keys are required for sign-in. Add OPENAI_API_KEY (or other LLM keys) for live generation.
```

### Option A — Docker Compose (full stack)

```bash
docker compose up --build -d
```

| Service    | URL / port | Notes |
|------------|------------|--------|
| **Web**    | **http://localhost:3001** | Mapped to host **3001** so a local `pnpm dev` can keep using **3000**. |
| **API**    | http://localhost:8000 | OpenAPI at `/docs`. |
| **Deep health** | http://localhost:8000/health/deep | Postgres + Redis checks. |
| **MinIO**  | http://localhost:9001 (console), API :9000 | Set `STORAGE_*` in `.env` to match. |
| **Postgres** | localhost:5432 | User/password/db: `postgres` / `postgres` / `forge_dev`. |

The `api` container runs **Alembic migrations** on startup (`alembic upgrade head`). **Create `.env` before `docker compose up`** — `web`, `api`, and `worker` use `env_file: .env` so Clerk, LLM keys, and storage settings reach the containers.

**Seed demo data** (idempotent — safe to run twice):

```bash
docker compose exec api uv run python scripts/seed_dev.py
```

**Tests inside containers** (from repo root, stack running):

```bash
docker compose exec api uv run pytest
docker compose exec web sh -c "corepack enable && corepack prepare pnpm@9 --activate && pnpm install && pnpm --filter web test"
```

### Option B — Local dev (no Docker for web)

From repo root, with Postgres/Redis/MinIO running (e.g. only infra services from Compose):

```bash
pnpm install
pnpm dev
```

- **Web:** http://localhost:3000  
- Point `NEXT_PUBLIC_API_URL` at your API (e.g. http://localhost:8000/api/v1).

Run API locally: see `apps/api/README.md` or `uv run uvicorn` from `apps/api`.

### After boot — smoke checks

1. **Marketing:** http://localhost:3001 (Docker) or http://localhost:3000 (local) — landing page loads.
2. **App shell:** http://localhost:3001/dashboard — redirects to Clerk **sign-in** if unauthenticated (`/app` also redirects to `/dashboard`).
3. **API:** `curl -s http://localhost:8000/health` → healthy JSON.

> **Compose services:** `docker-compose.yml` includes **web, api, worker, postgres, redis, minio**. There is **no Caddy** in this file — TLS termination is for Railway/production (see `infra/` and deployment docs).

### Signup → onboarding → brand (Mission 02)

1. **Sign up** with Clerk (`/signup`); the app calls `POST /api/v1/auth/signup` to create the Forge `User`, default **Organization**, and **Owner** membership.
2. Complete **onboarding** (`/onboarding`) for workspace name and initial brand hints (skippable).
3. Adjust **brand** under **Settings → Brand** (`/settings/brand`); the API persists `BrandKit` and optional logo to MinIO/S3.

The browser sends **`Authorization: Bearer`** (Clerk JWT) and **`x-forge-active-org-id`** on API calls; Postgres **RLS** enforces tenant isolation. See `docs/runbooks/TENANT_ISOLATION.md`.

### Studio (Mission 03)

1. Open **Studio** (`/studio`), enter a prompt (or use a chip), and **Generate**.
2. The API streams **SSE** events (`intent` → `html.chunk` → `html.complete`) while composing sections from the template library; the preview updates in an **iframe**.
3. **Refine** with follow-up messages, or use **Edit mode** to target a section by `data-forge-section` id. Set **`OPENAI_API_KEY`** (or other provider keys) in `.env` for live LLM calls.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 async |
| Database | PostgreSQL 16 (RLS), Redis 7 |
| Storage | MinIO (local) / S3 (production) |
| AI | OpenAI, Anthropic, Google Gemini (provider-abstracted) |
| Email | Resend |
| Billing | Stripe |
| Deploy | Docker, Railway |

## Repository Structure

```
forge-app/
├── apps/
│   ├── web/          # Next.js 16 frontend
│   ├── api/          # FastAPI backend
│   └── worker/       # Background job worker
├── packages/         # Shared code (types, eslint config)
├── docs/             # Documentation & architecture decisions
├── infra/            # Railway, Caddy configs
└── docker-compose.yml
```

## Documentation

See `docs/` for architecture decisions, external library references, and runbooks.

## License

Proprietary — Digital Studio Labs
