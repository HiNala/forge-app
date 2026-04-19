# External Reference Documentation — Forge

This directory holds curated, Forge-specific notes for every external library and service we depend on. Each file includes a **pinned version**, the **API surface we actually use**, **pitfalls**, **copy-paste snippets**, and **links** to official documentation.

**Last compiled:** 2026-04-18  
**Mission:** 00 — Documentation Research & Compilation  
**Canonical decisions:** `docs/architecture/DECISIONS.md` (ADR-001–ADR-007)

## Directory layout

```
docs/external/
├── frontend/
├── backend/
├── database/
├── ai/
├── integrations/
├── infrastructure/
└── security/
```

## Index by area

### Frontend (10 files)

| File | Version (at research) | Summary |
|------|-------------------------|---------|
| [frontend/nextjs-16-app-router.md](frontend/nextjs-16-app-router.md) | Next.js 16.2.4 | App Router, caching, `proxy.ts`, metadata |
| [frontend/react-19.md](frontend/react-19.md) | React 19.2.4 | Compiler, hooks, Server vs Client Components |
| [frontend/tailwind-css.md](frontend/tailwind-css.md) | Tailwind v4 | Tokens, `@theme`, dark mode |
| [frontend/tanstack-query.md](frontend/tanstack-query.md) | TanStack Query v5 | Queries, mutations, SSR |
| [frontend/zustand.md](frontend/zustand.md) | Zustand 5.x | Stores, persistence |
| [frontend/zod.md](frontend/zod.md) | Zod 3.24.x | Schemas, sharing with API types |
| [frontend/shadcn-ui.md](frontend/shadcn-ui.md) | shadcn/ui | Install, theming, component list |
| [frontend/framer-motion.md](frontend/framer-motion.md) | Motion 12.x | Section crossfade pattern |
| [frontend/lucide-react.md](frontend/lucide-react.md) | lucide-react | Icons |
| [frontend/fetch-event-source.md](frontend/fetch-event-source.md) | @microsoft/fetch-event-source 2.x | POST + SSE for Studio |

### Backend (10 files)

| File | Version (at research) | Summary |
|------|-------------------------|---------|
| [backend/fastapi.md](backend/fastapi.md) | FastAPI 0.136.x | Lifespan, DI, SSE, middleware |
| [backend/sqlalchemy-2-async.md](backend/sqlalchemy-2-async.md) | SQLAlchemy 2.0.x | AsyncSession, `Mapped`, loading |
| [backend/alembic-async.md](backend/alembic-async.md) | Alembic 1.14.x | Async `env.py`, autogenerate |
| [backend/pydantic-v2.md](backend/pydantic-v2.md) | Pydantic v2 | Models, validators |
| [backend/asyncpg.md](backend/asyncpg.md) | asyncpg 0.30.x | Pooling, timeouts |
| [backend/uv-python-package-manager.md](backend/uv-python-package-manager.md) | uv 0.6.x | `uv sync`, Docker |
| [backend/ruff.md](backend/ruff.md) | Ruff 0.8.x | Ruleset E/W/F/I/N/UP/B/SIM/C4/PT/RUF |
| [backend/pytest-asyncio.md](backend/pytest-asyncio.md) | pytest-asyncio 0.24.x | Async tests, DB fixtures |
| [backend/arq-or-celery.md](backend/arq-or-celery.md) | **arq** 0.28.0 | Background jobs (ADR-001; Celery compared) |
| [backend/sse-starlette.md](backend/sse-starlette.md) | sse-starlette 2.x | SSE, keepalive, buffering headers |

### Database (4 files)

| File | Version (at research) | Summary |
|------|-------------------------|---------|
| [database/postgres-16.md](database/postgres-16.md) | PostgreSQL 16 | JSONB, UUID, CITEXT, indexes |
| [database/row-level-security.md](database/row-level-security.md) | PG 16 | `app.current_tenant_id`, policies |
| [database/pg-partman.md](database/pg-partman.md) | pg_partman 5.x | Time partitions (ADR-004) |
| [database/redis-7.md](database/redis-7.md) | Redis 7 | Rate limits, queues, TTL |

### AI (6 files)

| File | Version (at research) | Summary |
|------|-------------------------|---------|
| [ai/openai-api.md](ai/openai-api.md) | OpenAI API v1 | Chat, stream, tools, JSON |
| [ai/anthropic-api.md](ai/anthropic-api.md) | Anthropic Messages API | Stream events, cache |
| [ai/google-gemini-api.md](ai/google-gemini-api.md) | Gemini API | `generateContent`, stream |
| [ai/litellm-or-custom-adapter.md](ai/litellm-or-custom-adapter.md) | **LiteLLM** 1.83.10 | Unified SDK (ADR-003) |
| [ai/prompt-caching-strategies.md](ai/prompt-caching-strategies.md) | — | Cross-provider caching |
| [ai/token-optimization.md](ai/token-optimization.md) | — | Cost reduction patterns |

### Integrations (6 files)

| File | Version (at research) | Summary |
|------|-------------------------|---------|
| [integrations/clerk-or-authjs.md](integrations/clerk-or-authjs.md) | **Clerk** `@clerk/nextjs` 7.2.3 | Auth + orgs (ADR-002) |
| [integrations/resend.md](integrations/resend.md) | resend-py 2.x | Transactional email |
| [integrations/google-calendar-api-python.md](integrations/google-calendar-api-python.md) | Calendar API v3 | Events, OAuth |
| [integrations/google-oauth-setup.md](integrations/google-oauth-setup.md) | OAuth 2.0 | Consent screen |
| [integrations/stripe-subscriptions.md](integrations/stripe-subscriptions.md) | Stripe API 11.x / SDK | Subscriptions, webhooks |
| [integrations/sentry.md](integrations/sentry.md) | sentry-sdk 2.x | FastAPI + Next.js |

### Infrastructure (5 files)

| File | Summary |
|------|---------|
| [infrastructure/docker-best-practices.md](infrastructure/docker-best-practices.md) | Multi-stage, uv, Next standalone |
| [infrastructure/docker-compose-production.md](infrastructure/docker-compose-production.md) | Dev vs prod Compose |
| [infrastructure/railway-deployment.md](infrastructure/railway-deployment.md) | Railway services, env |
| [infrastructure/caddy-reverse-proxy.md](infrastructure/caddy-reverse-proxy.md) | HTTPS, on-demand TLS |
| [infrastructure/github-actions-ci.md](infrastructure/github-actions-ci.md) | Lint, typecheck, test, cache |

### Security (4 files)

| File | Summary |
|------|---------|
| [security/owasp-checklist.md](security/owasp-checklist.md) | Top 10 → Forge mitigations |
| [security/csp-for-generated-content.md](security/csp-for-generated-content.md) | CSP for public pages |
| [security/file-upload-security.md](security/file-upload-security.md) | MIME, size, storage |
| [security/rate-limiting-patterns.md](security/rate-limiting-patterns.md) | Redis limits |

**Total:** 45 markdown references under `docs/external/`.

## Which mission reads which doc (quick map)

| Mission | Primary references |
|---------|-------------------|
| 01 Contracts & scaffold | `database/*`, `backend/fastapi.md`, `backend/pydantic-v2.md`, `architecture/DATA_MODEL_OVERVIEW.md`, ADRs |
| 02 Foundation | `integrations/clerk-or-authjs.md`, `database/row-level-security.md`, `architecture/MULTI_TENANCY.md` |
| 03 Studio & AI | `ai/*`, `backend/sse-starlette.md`, `frontend/fetch-event-source.md`, `architecture/AI_ORCHESTRATION.md` |
| 04 Live pages | `security/*`, `database/postgres-16.md`, `infrastructure/caddy-reverse-proxy.md` |
| 05 Automations | `integrations/resend.md`, `integrations/google-calendar-api-python.md`, `backend/arq-or-celery.md` |
| 06 Analytics & billing | `integrations/stripe-subscriptions.md`, `database/pg-partman.md` |
| 07 Polish | `security/owasp-checklist.md`, all frontend a11y-related docs |
| 08 Railway | `infrastructure/railway-deployment.md`, `docs/runbooks/*` (Mission 08) |
| 09 Templates | Reuses `frontend/shadcn-ui.md`, `architecture/DATA_MODEL_OVERVIEW.md` |

## When to extend a doc

If a downstream mission needs a detail that is missing, **add it here** (with version + date) instead of guessing in application code. Link the change in the relevant mission report.

## Header convention

Each reference file should start with:

```markdown
# <Name> — Reference for Forge

**Version:** …
**Last researched:** YYYY-MM-DD
```

If you add or substantially edit a file, bump **Last researched** and, when applicable, the **Version** line after checking npm/PyPI or the vendor’s docs.
