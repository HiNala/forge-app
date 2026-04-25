# Launch Readiness — First Boot & Green Check (2026-04-21)

This runbook covers **first-time bring-up** of the Forge stack on a fresh clone and the **green checklist** you should verify before every deploy. It complements the high-level [`docs/LAUNCH_CHECKLIST.md`](../LAUNCH_CHECKLIST.md) (staging/prod ops) with developer-focused mechanics.

---

## 1. Prerequisites

- Node.js ≥20 (see `package.json` engines)
- pnpm (install via `corepack enable` or npm)
- Docker Desktop (Windows) or Docker Engine (Linux)
- Python 3.12 + [uv](https://docs.astral.sh/uv/) (for API; installed automatically via `uv sync`)

---

## 2. First Boot (local dev)

### 2.1 Clone & install
```bash
git clone <repo>
cd forge-app
pnpm install
```

### 2.2 Environment files
Copy the example env and customize:
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

**Minimum viable `.env` overrides for local dev:**
```bash
# .env (repo root)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000

# apps/api/.env (or keep using root .env; see ENVIRONMENT_FILE precedence)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/forge_dev
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=dev-change-me-use-openssl-rand-hex-32
CLERK_JWKS_URL=https://<your-clerk-domain>/.well-known/jwks.json
CLERK_JWT_ISSUER=https://<your-clerk-domain>
CLERK_WEBHOOK_SECRET=whsec_<your-secret>
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
```

**If you already have Postgres/Redis/MinIO elsewhere**, change the URLs and skip step 2.3.

### 2.3 Start infrastructure (Postgres, Redis, MinIO)
```bash
docker compose up -d postgres redis minio
```
- Postgres UI: http://localhost:5433 (pgAdmin or use your client)
- MinIO Console: http://localhost:9001 (login minioadmin/minioadmin)

### 2.4 Init database & run migrations
```bash
cd apps/api
uv sync
uv run alembic upgrade head
```

### 2.5 Start API + Worker
Terminal A:
```bash
cd apps/api
uv run uvicorn app.main:app --reload --port 8000
```

Terminal B:
```bash
cd apps/api
uv run arq app.worker.WorkerSettings
```

### 2.6 Start Web
```bash
pnpm dev
# or (faster dev builds without Turbopack)
pnpm dev:web
```

Open http://localhost:3000. The app shell should load; sign-in will redirect to your Clerk instance.

---

## 3. Green Checklist (verify before every PR)

Run these from the **repo root**.

### 3.1 Web (Next.js)
```bash
# Lint (zero warnings policy)
pnpm --filter web lint:strict

# Type check
pnpm --filter web typecheck

# Unit tests (Vitest)
pnpm --filter web test

# Production build (catches prerender issues)
pnpm --filter web build
```
**Expect:** All green, 24 tests pass, build completes without "aborting" logs.

### 3.2 API (FastAPI)
```bash
# Style/linting
pnpm ruff
# or: uv --directory apps/api run ruff check .

# Type checking (mypy strict)
pnpm mypy
# or: uv --directory apps/api run mypy

# Unit tests (optionally skip infra-heavy tests if Postgres is down)
pnpm test:api
# or: uv --directory apps/api run pytest -q
```
**Expect:**
- Ruff: "All checks passed!"
- Mypy: "Success: no issues found in 259 source files"
- Pytest: 97+ passed (11 may fail with ConnectionRefused if Postgres is not running; those are infra-gated, not code bugs)

### 3.3 One-shot verify (convenience script)
```bash
pnpm verify
```
Runs: `lint:strict` → `typecheck` → `test` → `ruff` → `mypy`

---

## 4. Known Windows-specific notes

### Line endings (CRLF/LF)
We added `.gitattributes` to normalize line endings. If you see phantom diffs on every file:
```bash
# One-time renormalize (commit the result)
git add --renormalize .
git commit -m "chore: normalize line endings"
```

### Docker Desktop file sharing
If Postgres/MinIO containers fail to start with volume mount errors, ensure Docker Desktop settings enable file sharing for the repo drive (usually `C:`).

### uv/venv discovery on Windows PowerShell
If `uv run` complains about missing venv, ensure you ran `uv sync` inside `apps/api` at least once. The venv is gitignored and must be recreated on fresh clones.

---

## 5. What was fixed recently (2026-04-21)

| Issue | Symptom | Fix |
|-------|---------|-----|
| Empty `docker-compose.yml` | `docker compose config` fails or services missing | Restored from `git checkout HEAD -- docker-compose.yml` |
| ESLint `@typescript-eslint/no-require-imports` on `.cjs` | `pnpm lint` fails in `scripts/check-api-duplicates.cjs` | Added override in `apps/web/eslint.config.mjs` to allow `require()` in `**/*.cjs` |
| Missing env vars in `.env.example` | Production boot surprises (e.g., `TRUSTED_HOSTS`, `APP_ROOT_DOMAIN`, `METRICS_TOKEN`) | Added missing vars with comments |
| `/metrics` endpoint unauthenticated | Prometheus metrics publicly exposed | Added `METRICS_TOKEN` gating with constant-time compare; regression test added |
| `public_api.py` `NameError` | Crash on analytics track due to undefined `_ALLOWED_TRACK_EVENTS` | Removed redundant/dead validation; delegated to `handle_public_track_batch` (uses `EVENTS` registry) |
| Cosmetic ruff warnings | CI noise | Fixed import sort, line length, ternary style in `admin_platform.py` |

---

## 6. Quick smoke tests

After boot:
1. **Health:** `curl http://localhost:8000/health/ready` → `{"status":"ready",...}`
2. **Metrics (dev, open):** `curl http://localhost:8000/metrics` → Prometheus text
3. **Metrics (prod simulation):**
   ```bash
   # Should 401 without token
   curl http://localhost:8000/metrics
   # Should 200 with token
   curl -H "Authorization: Bearer scrape-secret" http://localhost:8000/metrics
   ```
4. **Web:** http://localhost:3000/dashboard loads without 500.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `ConnectionRefusedError` in API tests | Postgres not running | Start infra: `docker compose up -d postgres redis` |
| `Module not found` in API | Virtualenv stale | `cd apps/api && uv sync` |
| `lint:strict` fails on `.cjs` | Outdated eslint config | Ensure `eslint.config.mjs` includes the `.cjs` override (see section 5) |
| MinIO upload fails | Bucket not created | Create `forge-uploads` bucket in MinIO Console or use the default |
| Clerk redirect loops | `CLERK_JWKS_URL` / `CLERK_JWT_ISSUER` mismatch | Verify URLs match your Clerk instance (include `https://`) |

---

## 8. Production hardening (checklist before go-live)

See [`docs/LAUNCH_CHECKLIST.md`](../LAUNCH_CHECKLIST.md) for the full production ops checklist (TLS, DNS, Stripe live keys, Sentry, etc). The highlights:

- `ENVIRONMENT=production` in prod (API refuses boot with weak secrets when set)
- `SECRET_KEY` → 32+ hex from `openssl rand -hex 32` (never the dev placeholder)
- `TRUSTED_HOSTS` → real hostnames (not `*`)
- `METRICS_TOKEN` → long random; configure Prometheus with `bearer_token`
- `FORGE_E2E_TOKEN` → empty (disables `__e2e__` bootstrap)
- `AUTH_TEST_BYPASS=false` (never true in prod)
- `SENTRY_DSN` set for api + web
- Database backups enabled (Mission 07)

---

## 9. Run this now (copy-paste)

```bash
# 1) Verify everything is green
pnpm verify

# 2) If you have Docker infra up, run the heavier API tests
pnpm test:api

# 3) Build web for prod (catches prerender errors)
pnpm --filter web build
```

All green? You're good to commit, push, and eventually deploy.
