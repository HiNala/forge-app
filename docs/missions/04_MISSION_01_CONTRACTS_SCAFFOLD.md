# MISSION 01 — API Contracts, Database Schema & Application Scaffold

**Goal:** Fully specify every API endpoint Forge exposes, every database table it stores, every Pydantic schema it sends or receives, and then scaffold both the Next.js and FastAPI applications using their official initializers so that `docker compose up --build` produces a running (but mostly empty) application that the rest of the missions fill in. At the end of this mission there is no product yet — but there is a skeleton that every downstream mission slots into without structural debate.

**Branch:** `mission-01-contracts-scaffold`
**Prerequisites:** Mission 00 complete. `docs/external/`, `docs/architecture/DECISIONS.md`, and `docs/architecture/DATA_MODEL_OVERVIEW.md` all exist and are current.
**Estimated scope:** Largest single mission by volume. Produces ~30–40 files. Heavy commit activity.

---

## How To Run This Mission

Read this entire document before writing anything. Then make a todo list. Then read the PRD, Mission 00 decisions, and the user case reports. Only then do you start scaffolding. The order matters — if you scaffold before the schema is locked, you will refactor three times.

Throughout this mission, push to GitHub on every meaningful milestone. Recommended milestones to commit at: `chore: repo structure and root configs`, `feat(api): scaffold FastAPI app with uv`, `feat(web): scaffold Next.js 16 with pnpm`, `feat(db): initial schema migration`, `feat(api): Pydantic schemas for all endpoints`, `feat(api): route stubs mapped to OpenAPI spec`, `chore(compose): full docker-compose with healthchecks`.

Use the app builders, not manual file creation. This is explicit in the brief. For the frontend, use `pnpm create next-app` and accept recommended defaults where sensible. For the backend, use `uv init` to bootstrap. Do not hand-craft dependency lists that exist in official templates.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## Part A — The Database Schema

This is the authoritative schema. Every table below is created via Alembic migration in this mission. Every table gets a down-migration. Every table that belongs to a tenant gets an `organization_id` and an RLS policy. Every table gets the standard `id UUID DEFAULT gen_random_uuid()`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()` columns unless explicitly noted.

### Tenant & Identity Tables

**users**
- `id UUID PK`
- `email CITEXT UNIQUE NOT NULL`
- `display_name TEXT`
- `avatar_url TEXT`
- `auth_provider_id TEXT` — ID from Clerk or Auth.js
- `created_at`, `updated_at`
- **No `organization_id`** — users are global; they belong to orgs via Membership
- Index: `email`

**organizations**
- `id UUID PK`
- `slug TEXT UNIQUE NOT NULL` — used in public URLs (`workspace.forge.app`)
- `name TEXT NOT NULL`
- `plan TEXT NOT NULL DEFAULT 'trial'` — `trial | starter | pro | enterprise`
- `trial_ends_at TIMESTAMPTZ`
- `stripe_customer_id TEXT`
- `stripe_subscription_id TEXT`
- `created_at`, `updated_at`
- Index: `slug`, `stripe_customer_id`

**memberships**
- `id UUID PK`
- `user_id UUID FK users(id) ON DELETE CASCADE`
- `organization_id UUID FK organizations(id) ON DELETE CASCADE`
- `role TEXT NOT NULL` — `owner | editor | viewer`
- `created_at`, `updated_at`
- UNIQUE (user_id, organization_id)
- RLS: allow read if current user is a member of this org

**invitations**
- `id UUID PK`
- `organization_id UUID FK organizations(id) ON DELETE CASCADE`
- `email CITEXT NOT NULL`
- `role TEXT NOT NULL`
- `token TEXT UNIQUE NOT NULL` — random, 32 bytes
- `expires_at TIMESTAMPTZ NOT NULL` — default 7 days
- `accepted_at TIMESTAMPTZ`
- `invited_by_user_id UUID FK users(id)`
- `created_at`
- RLS on organization_id

**brand_kits**
- `id UUID PK`
- `organization_id UUID UNIQUE FK organizations(id) ON DELETE CASCADE` — one per org
- `primary_color TEXT` — hex or oklch string
- `secondary_color TEXT`
- `logo_url TEXT`
- `display_font TEXT`
- `body_font TEXT`
- `voice_note TEXT` — passed to LLM prompts
- `updated_at`
- RLS on organization_id

### Page & Studio Tables

**pages**
- `id UUID PK`
- `organization_id UUID FK organizations(id) ON DELETE CASCADE`
- `slug TEXT NOT NULL` — UNIQUE within organization (compound unique)
- `page_type TEXT NOT NULL` — `booking_form | contact_form | event_rsvp | daily_menu | proposal | landing | gallery | custom`
- `title TEXT NOT NULL`
- `status TEXT NOT NULL DEFAULT 'draft'` — `draft | live | archived`
- `current_html TEXT` — the latest generated HTML
- `form_schema JSONB` — the canonical form field definition (nullable if no form)
- `brand_kit_snapshot JSONB` — brand kit at time of last publish (so updates don't break live pages)
- `intent_json JSONB` — the structured intent from the parser, for later refinement context
- `published_version_id UUID FK page_versions(id)` — current live version
- `created_by_user_id UUID FK users(id)`
- `created_at`, `updated_at`
- UNIQUE (organization_id, slug)
- RLS on organization_id

**page_versions** (immutable snapshots)
- `id UUID PK`
- `page_id UUID FK pages(id) ON DELETE CASCADE`
- `organization_id UUID FK organizations(id)` — denormalized for RLS
- `version_number INT NOT NULL`
- `html TEXT NOT NULL`
- `form_schema JSONB`
- `brand_kit_snapshot JSONB`
- `published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `published_by_user_id UUID FK users(id)`
- UNIQUE (page_id, version_number)
- RLS on organization_id

**page_revisions** (in-session edit history, TTL cleanup)
- `id UUID PK`
- `page_id UUID FK pages(id) ON DELETE CASCADE`
- `organization_id UUID FK organizations(id)`
- `html TEXT NOT NULL`
- `edit_type TEXT NOT NULL` — `full_page | section_hero | section_form | section_cta | ...`
- `user_prompt TEXT`
- `tokens_used INT`
- `llm_provider TEXT`
- `llm_model TEXT`
- `created_at`
- Retention: 30 days (worker job)
- RLS on organization_id

**conversations**
- `id UUID PK`
- `page_id UUID FK pages(id) ON DELETE CASCADE`
- `organization_id UUID FK organizations(id)`
- `created_at`, `updated_at`
- RLS on organization_id

**messages**
- `id UUID PK`
- `conversation_id UUID FK conversations(id) ON DELETE CASCADE`
- `organization_id UUID FK organizations(id)`
- `role TEXT NOT NULL` — `user | assistant | system`
- `content TEXT NOT NULL`
- `created_at`
- RLS on organization_id

### Submissions Tables (PARTITIONED)

**submissions** (range-partitioned by `created_at` monthly)
- `id UUID` — part of composite PK with created_at
- `organization_id UUID FK organizations(id)`
- `page_id UUID FK pages(id) ON DELETE CASCADE`
- `page_version_id UUID FK page_versions(id)` — so we know which form version was submitted
- `payload JSONB NOT NULL` — the field values
- `submitter_email CITEXT` — denormalized for fast filtering / emails
- `submitter_name TEXT`
- `status TEXT NOT NULL DEFAULT 'new'` — `new | read | replied | archived`
- `source_ip INET` — anonymized to /24 after 30 days
- `user_agent TEXT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` — partition key
- PRIMARY KEY (id, created_at)
- Index: (organization_id, page_id, created_at DESC)
- RLS on organization_id

**submission_files**
- `id UUID PK`
- `submission_id UUID` — NOT FK because submissions is partitioned; enforce integrity in app
- `organization_id UUID FK organizations(id)`
- `field_name TEXT NOT NULL`
- `storage_key TEXT NOT NULL` — S3/MinIO path
- `file_name TEXT NOT NULL`
- `content_type TEXT`
- `size_bytes BIGINT`
- `created_at`
- RLS on organization_id

**submission_replies**
- `id UUID PK`
- `submission_id UUID`
- `organization_id UUID FK organizations(id)`
- `subject TEXT NOT NULL`
- `body TEXT NOT NULL`
- `sent_by_user_id UUID FK users(id)`
- `resend_message_id TEXT`
- `created_at`
- RLS on organization_id

### Automation Tables

**automation_rules**
- `id UUID PK`
- `page_id UUID FK pages(id) ON DELETE CASCADE`
- `organization_id UUID FK organizations(id)`
- `notify_emails TEXT[]` — up to 5
- `confirm_submitter BOOLEAN DEFAULT TRUE`
- `confirm_template_subject TEXT`
- `confirm_template_body TEXT`
- `calendar_sync_enabled BOOLEAN DEFAULT FALSE`
- `calendar_connection_id UUID FK calendar_connections(id)`
- `calendar_event_duration_min INT DEFAULT 60`
- `calendar_send_invite BOOLEAN DEFAULT TRUE`
- `updated_at`
- UNIQUE (page_id)
- RLS on organization_id

**calendar_connections**
- `id UUID PK`
- `user_id UUID FK users(id) ON DELETE CASCADE`
- `organization_id UUID FK organizations(id)`
- `provider TEXT NOT NULL` — `google | apple`
- `calendar_id TEXT NOT NULL`
- `calendar_name TEXT`
- `access_token_encrypted TEXT NOT NULL` — AES-GCM with SECRET_KEY
- `refresh_token_encrypted TEXT`
- `token_expires_at TIMESTAMPTZ`
- `scopes TEXT[]`
- `connected_at`
- `last_used_at`
- RLS on organization_id

**automation_runs** (for observability / retry tracking)
- `id UUID PK`
- `automation_rule_id UUID FK automation_rules(id) ON DELETE CASCADE`
- `organization_id UUID FK organizations(id)`
- `submission_id UUID`
- `step TEXT NOT NULL` — `notify | confirm | calendar_event | calendar_invite`
- `status TEXT NOT NULL` — `pending | success | failed | retrying`
- `error_message TEXT`
- `attempt INT DEFAULT 1`
- `ran_at`
- RLS on organization_id

### Analytics Tables (PARTITIONED)

**analytics_events** (range-partitioned by `created_at` monthly)
- `id UUID`
- `organization_id UUID FK organizations(id)`
- `page_id UUID FK pages(id) ON DELETE CASCADE`
- `event_type TEXT NOT NULL` — `page_view | section_dwell | cta_click | form_start | form_field_touch | form_submit | form_abandon | proposal_accept | proposal_decline`
- `visitor_id TEXT NOT NULL` — cookie-based, not PII
- `session_id TEXT NOT NULL`
- `metadata JSONB` — per-event-type context (section name, field name, dwell_ms)
- `source_ip INET`
- `user_agent TEXT`
- `referrer TEXT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- PRIMARY KEY (id, created_at)
- Index: (organization_id, page_id, event_type, created_at)
- Retention: 90 days default, configurable per plan (worker drops old partitions)
- RLS on organization_id

### Templates Table (Mission 09)

**templates**
- `id UUID PK`
- `name TEXT NOT NULL`
- `description TEXT`
- `category TEXT NOT NULL` — `booking | contact | rsvp | menu | proposal | landing | gallery`
- `preview_image_url TEXT`
- `html TEXT NOT NULL`
- `form_schema JSONB`
- `intent_json JSONB`
- `is_published BOOLEAN DEFAULT FALSE`
- `sort_order INT DEFAULT 0`
- `created_at`, `updated_at`
- No `organization_id` — templates are global; no RLS

### Subscription & Usage Tables

**subscription_usage** (for tracking AI usage quota per org)
- `id UUID PK`
- `organization_id UUID FK organizations(id) ON DELETE CASCADE`
- `period_start DATE NOT NULL` — first of month
- `pages_generated INT DEFAULT 0`
- `section_edits INT DEFAULT 0`
- `tokens_prompt BIGINT DEFAULT 0`
- `tokens_completion BIGINT DEFAULT 0`
- `cost_cents INT DEFAULT 0`
- `updated_at`
- UNIQUE (organization_id, period_start)
- RLS on organization_id

---

## Part B — The API Contracts

Every endpoint below is a POST / GET / PATCH / DELETE, lives under `/api/v1/`, returns JSON unless otherwise noted, and requires a valid authenticated session unless flagged `public`. Every endpoint has request and response Pydantic schemas — see Part C.

### Auth & Session

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/signup` | Create user + default org + owner membership |
| `POST` | `/api/v1/auth/signin` | Begin session (delegates to Clerk/Auth.js) |
| `POST` | `/api/v1/auth/signout` | End session |
| `GET`  | `/api/v1/auth/me` | Current user + memberships + active org |
| `POST` | `/api/v1/auth/switch-org` | Set active org for session |
| `POST` | `/api/v1/auth/webhook` | Clerk/Auth.js webhook endpoint for user lifecycle |

### Organizations & Brand Kit

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/v1/org` | Get current org |
| `PATCH`| `/api/v1/org` | Update org name, slug (owner only) |
| `GET`  | `/api/v1/org/brand` | Get brand kit |
| `PUT`  | `/api/v1/org/brand` | Update brand kit |
| `POST` | `/api/v1/org/brand/logo` | Upload logo (multipart) |
| `DELETE`| `/api/v1/org` | Soft-delete org, 30-day grace |

### Team & Invitations

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/v1/team/members` | List memberships in active org |
| `POST` | `/api/v1/team/invite` | Invite by email + role |
| `POST` | `/api/v1/team/invitations/{token}/accept` | Accept invite |
| `DELETE` | `/api/v1/team/members/{member_id}` | Remove member (owner only) |
| `PATCH` | `/api/v1/team/members/{member_id}` | Change member role |

### Pages

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/v1/pages` | List pages (paginated, filter by status, type) |
| `POST` | `/api/v1/pages` | Create a blank page (rare; usually Studio creates) |
| `GET`  | `/api/v1/pages/{page_id}` | Get page including current HTML, form schema, brand snapshot |
| `PATCH` | `/api/v1/pages/{page_id}` | Update title, slug, form_schema (not HTML — that comes via Studio) |
| `DELETE` | `/api/v1/pages/{page_id}` | Soft-delete (archived status) |
| `POST` | `/api/v1/pages/{page_id}/publish` | Create PageVersion, mark live |
| `POST` | `/api/v1/pages/{page_id}/unpublish` | Mark draft |
| `GET`  | `/api/v1/pages/{page_id}/versions` | List versions |
| `POST` | `/api/v1/pages/{page_id}/revert/{version_id}` | Revert to a past version |
| `POST` | `/api/v1/pages/{page_id}/duplicate` | Clone into a new draft |

### Studio / AI Generation

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/studio/generate` (SSE) | Generate a new page from a prompt; streams chunks |
| `POST` | `/api/v1/studio/refine` (SSE) | Refine an existing page with a new chat message |
| `POST` | `/api/v1/studio/sections/edit` | Section-targeted edit (fast model, non-streaming) |
| `GET`  | `/api/v1/studio/conversations/{page_id}` | Get chat history for a page |
| `POST` | `/api/v1/studio/conversations/{page_id}/messages` | Append a message |

Request shape for `POST /api/v1/studio/generate`:

```json
{
  "prompt": "Small jobs booking page for Reds Construction...",
  "page_id": null,
  "session_id": "uuid",
  "provider": "openai"
}
```

SSE response events:

```
event: intent
data: {"page_type":"booking_form","fields":[...]}

event: html.start
data: {}

event: html.chunk
data: {"chunk":"<section class='hero'>..."}

event: html.chunk
data: {"chunk":"</section>..."}

event: html.complete
data: {"page_id":"uuid","slug":"small-jobs","url":"/p/.../small-jobs"}

event: error
data: {"code":"validation_failed","message":"..."}
```

### Submissions (Private Admin)

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/v1/pages/{page_id}/submissions` | List submissions (paginated, status filter, search) |
| `GET`  | `/api/v1/submissions/{submission_id}` | Get full submission with files |
| `PATCH` | `/api/v1/submissions/{submission_id}` | Update status (read/replied/archived) |
| `POST` | `/api/v1/submissions/{submission_id}/reply` | Send email reply via Resend |
| `GET`  | `/api/v1/pages/{page_id}/submissions/export` | CSV export (streamed) |
| `GET`  | `/api/v1/submissions/{submission_id}/files/{file_id}` | Presigned URL to download file |

### Submissions (Public Submit Endpoint)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/p/{slug}/submit` | PUBLIC — form submission target on generated pages; rate-limited by IP |
| `POST` | `/p/{slug}/upload` | PUBLIC — presigned upload for file fields; rate-limited |

Route note: the `/p/{slug}/` path is served by Next.js publicly (for rendering) but POSTs go to the backend. Implementation detail in Mission 04.

### Automations

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/v1/pages/{page_id}/automations` | Get rules |
| `PUT`  | `/api/v1/pages/{page_id}/automations` | Upsert rules |
| `POST` | `/api/v1/calendar/connect/google` | Begin Google OAuth |
| `GET`  | `/api/v1/calendar/callback/google` | OAuth callback |
| `DELETE` | `/api/v1/calendar/connections/{id}` | Disconnect |
| `GET`  | `/api/v1/calendar/connections` | List user's connections |
| `GET`  | `/api/v1/pages/{page_id}/automations/runs` | Observability — recent runs |

### Analytics

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/p/{slug}/track` | PUBLIC — beacon endpoint for page events |
| `GET`  | `/api/v1/pages/{page_id}/analytics/summary` | Totals + trend |
| `GET`  | `/api/v1/pages/{page_id}/analytics/funnel` | Form funnel (form_start → submit, per field drop-off) |
| `GET`  | `/api/v1/pages/{page_id}/analytics/events` | Paginated event stream |
| `GET`  | `/api/v1/analytics/summary` | Org-wide summary |

### Billing

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/v1/billing/plan` | Current plan |
| `POST` | `/api/v1/billing/checkout` | Stripe checkout session |
| `POST` | `/api/v1/billing/portal` | Stripe customer portal session |
| `POST` | `/api/v1/billing/webhook` | Stripe webhook (no auth, signature verified) |
| `GET`  | `/api/v1/billing/usage` | Current period usage |

### Templates (Mission 09)

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/v1/templates` | List templates (no auth required for browsing) |
| `GET`  | `/api/v1/templates/{id}` | Template detail |
| `POST` | `/api/v1/templates/{id}/use` | Clone template into a new Page draft |

### Admin (Internal Only — this tenant is Digital Studio Labs)

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/v1/admin/organizations` | List all orgs |
| `GET`  | `/api/v1/admin/usage` | Usage across all orgs |
| `POST` | `/api/v1/admin/templates` | Create a template (admin-only role) |

---

## Part C — Pydantic Schema Strategy

- Every request schema is `*Request`. Every response is `*Response`. Every entity dump is `*Read`. Every write shape is `*Write`.
- Schemas live in `apps/api/app/schemas/` with one file per domain (`auth.py`, `pages.py`, `submissions.py`, etc.).
- Every schema has a `model_config = ConfigDict(from_attributes=True)` when it wraps an ORM model.
- Every schema field has an example in `Field(..., example=...)` for OpenAPI docs.
- Generate TypeScript types for the frontend from the OpenAPI schema using `openapi-typescript` in CI. These land in `packages/types/`.

Example `pages.py` schemas to include in this mission (stubs okay, filled in by Mission 04):

```python
class PageRead(BaseModel):
    id: UUID
    slug: str
    page_type: Literal["booking_form", "contact_form", "event_rsvp", "daily_menu", "proposal", "landing", "gallery", "custom"]
    title: str
    status: Literal["draft", "live", "archived"]
    current_html: str
    form_schema: dict | None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
```

---

## Part D — Scaffolding the Applications

### Repo Root

1. Create root `package.json` with pnpm workspaces config listing `apps/*` and `packages/*`.
2. Create `pnpm-workspace.yaml`.
3. Create root `.gitignore` with Node, Python, Docker, editor patterns.
4. Create root `.editorconfig`, `.prettierrc`, `.ruff.toml`, root `tsconfig.base.json`.
5. Create `README.md` with a bootable "how to run locally" section referencing docker-compose.
6. Create `docker-compose.yml` with services: `web`, `api`, `worker`, `postgres`, `redis`, `minio`. Each service has a healthcheck. `depends_on` uses `condition: service_healthy` so the API waits for Postgres.
7. Create `docker-compose.prod.yml` as a reference (used by Railway Dockerfile builds, not for actual deploy).
8. Create `.env.example` mirroring PRD §9 exactly.
9. Create `.github/workflows/ci.yml` with: lint, typecheck, test for both apps in parallel jobs. Cache pnpm and uv. Matrix over Node 20 and Python 3.12.

### Frontend Scaffold

Use the official initializer. Do not hand-craft.

```bash
pnpm create next-app apps/web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --yes
```

Then on top of that:

1. Install runtime deps: `@tanstack/react-query`, `zustand`, `zod`, `framer-motion`, `lucide-react`, `@microsoft/fetch-event-source`, `date-fns`, `clsx`, `tailwind-merge`.
2. Install dev deps: `@types/node`, `prettier`, `prettier-plugin-tailwindcss`, `openapi-typescript`, `@tanstack/react-query-devtools`.
3. Run `pnpm dlx shadcn@latest init` and install base components (Button, Input, Textarea, Dialog, Sheet, Tabs, Toast, DropdownMenu, Avatar, Badge, Card).
4. Create the route group structure: `(marketing)`, `(app)`, `(public)`, `api`. Each with a bare `layout.tsx` and an empty `page.tsx`.
5. Create `src/lib/api.ts` — the typed API client that wraps `fetch` and reads `NEXT_PUBLIC_API_URL`.
6. Create `src/lib/sse.ts` — the `fetchEventSource` wrapper with typed event handlers.
7. Create `src/lib/auth.ts` — session reader (delegates to chosen auth provider per ADR-002).
8. Create `src/stores/ui.ts` — Zustand store for sidebar, toast queue.
9. Create `Dockerfile` with multi-stage build, `output: standalone` in `next.config.mjs`.
10. Add `pnpm-lock.yaml` after first install.

### Backend Scaffold

```bash
cd apps/api
uv init --python 3.12
uv add fastapi "uvicorn[standard]" sqlalchemy asyncpg alembic pydantic "pydantic-settings" \
       python-jose[cryptography] passlib[bcrypt] httpx redis arq resend google-auth \
       google-auth-oauthlib google-api-python-client stripe sentry-sdk[fastapi] \
       python-multipart sse-starlette
uv add --dev pytest pytest-asyncio ruff mypy types-redis httpx-sse
```

Then:

1. Create `app/main.py` with app factory, lifespan context manager, CORS middleware, Sentry init, include all routers.
2. Create `app/config.py` with `Settings` class reading env vars.
3. Create `app/db/session.py` with `create_async_engine`, `AsyncSession` factory, `get_db` dependency.
4. Create `app/db/base.py` with the declarative `Base`.
5. Create `app/db/models/` — one file per model (`user.py`, `organization.py`, `membership.py`, `page.py`, `submission.py`, `analytics_event.py`, etc.). Every model imports from `Base`.
6. Create `app/db/partitioning.py` — helpers to create partitions via pg_partman or manual SQL.
7. Create `app/middleware/tenant.py` — extracts active org from session, sets `app.current_tenant_id` PostgreSQL session variable on every request.
8. Create `app/middleware/rate_limit.py` — Redis-backed token bucket middleware.
9. Create `app/api/v1/__init__.py` with router aggregation.
10. Create `app/api/v1/{auth,pages,studio,submissions,automations,analytics,billing,team,brand,templates}.py` — each with stub endpoints matching Part B. Every endpoint has its Pydantic request/response types imported from `app/schemas/`.
11. Create `app/schemas/` with one file per domain, all schemas from Part C stubbed.
12. Create `app/services/` directories: `ai/`, `orchestration/`, plus `email.py`, `calendar.py`, `stripe.py`, `storage.py` — each with an interface stub.
13. Create `app/services/ai/base.py` defining the abstract `LLMProvider` protocol. Create `openai_provider.py`, `anthropic_provider.py`, `gemini_provider.py` as stubs. Create `router.py` with the selection logic.
14. Run `alembic init -t async alembic`, then configure `alembic/env.py` to import `Base.metadata` and use `async_engine_from_config`. Reference the GitHub issue in Mission 00 docs for the lifespan-compatible pattern.
15. Create initial migration: `alembic revision --autogenerate -m "initial schema"` — should produce all tables from Part A. Review the output manually to ensure partitioned tables are declared correctly (Alembic's autogenerate won't handle partitions; hand-edit that migration to use `postgresql_partition_by='RANGE (created_at)'`).
16. Create `tests/conftest.py` with async Postgres fixture, `tests/test_health.py` with a single test hitting `/health`.
17. Create backend `Dockerfile` using `python:3.12-slim`, install uv, `uv sync --frozen`, run `uvicorn app.main:app` via gunicorn with UvicornWorker in production.

### Worker Scaffold

18. Create `apps/worker/worker.py` — arq worker entrypoint. Define stub jobs: `send_notify_email`, `send_confirm_email`, `create_calendar_event`, `cleanup_old_revisions`, `drop_old_analytics_partitions`.
19. Create `apps/worker/Dockerfile`.

### Shared Packages

20. Create `packages/types/package.json` with a `build` script: `openapi-typescript http://localhost:8000/openapi.json -o ./index.ts`.
21. Create `packages/eslint-config/` with shared config consumed by `apps/web/.eslintrc.json`.

### Docker Compose

22. Wire the full `docker-compose.yml`:
    - `postgres`: `postgres:16-alpine`, volume, healthcheck `pg_isready`.
    - `redis`: `redis:7-alpine`, healthcheck `redis-cli ping`.
    - `minio`: `minio/minio:latest` with a bucket-create sidecar or on-start hook, healthcheck on `/minio/health/live`.
    - `api`: builds from `apps/api/Dockerfile`, depends on postgres + redis healthy, mounts `apps/api` for dev, runs `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`.
    - `worker`: builds from `apps/worker/Dockerfile`, depends on redis.
    - `web`: builds from `apps/web/Dockerfile`, depends on api, mounts `apps/web`, runs `pnpm dev --port 3000`.

### Verification

23. From a clean clone, `docker compose up --build` brings all services up healthy. `curl http://localhost:8000/health` returns 200. `curl http://localhost:3000/` returns 200. `curl http://localhost:8000/docs` shows OpenAPI UI with all stubbed endpoints.
24. All stubbed endpoints return a placeholder response (e.g., `{"ok":true,"stub":"endpoint not yet implemented"}`) with the correct status code and Pydantic validation active on inputs.
25. `pnpm --filter web typecheck` passes. `uv run --directory apps/api ruff check` passes. `uv run --directory apps/api mypy app` passes.
26. Generate OpenAPI TypeScript: from the running API, `cd packages/types && pnpm build` produces `index.ts` with typed endpoints.

---

## Acceptance Criteria

- All tables in Part A exist as SQLAlchemy models, with relationships, indexes, and appropriate constraints.
- Initial Alembic migration runs cleanly from scratch and creates every table, with partitions correctly declared.
- RLS policies are present for every table with an `organization_id`, and a test proves they cannot be bypassed without setting the session variable.
- All endpoints in Part B are defined as stubs in routers, with request/response schemas, and appear in the OpenAPI docs.
- Both applications scaffold correctly via their official initializers.
- `docker compose up --build` brings all services up healthy in under 60 seconds.
- CI pipeline runs green on an initial push.
- Mission report written to `docs/missions/MISSION-01-REPORT.md`.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
