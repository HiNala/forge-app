# External Reference Documentation — Forge

This directory contains research-compiled reference documentation for every external library, framework, and service used by Forge. Each doc includes the pinned version, Forge-specific usage patterns, code examples, and known pitfalls.

**Last compiled:** 2026-04-19

## Directory Structure

```
docs/external/
├── frontend/          # Next.js, React, Tailwind, State, UI
├── backend/           # FastAPI, SQLAlchemy, Testing, Tooling
├── database/          # PostgreSQL, Redis, RLS, Partitioning
├── ai/                # LLM Providers, Caching, Optimization
├── integrations/      # Auth, Email, Calendar, Billing, Monitoring
├── infrastructure/    # Docker, Deploy, CI, Proxy
└── security/          # OWASP, CSP, Uploads, Rate Limiting
```

## Frontend (10 docs)

| Doc | Version | Purpose |
|-----|---------|---------|
| [nextjs-16-app-router.md](frontend/nextjs-16-app-router.md) | 16.2.4 | App Router, routing, caching, proxy.ts |
| [react-19.md](frontend/react-19.md) | 19.2.0 | Hooks, Compiler, Server Components |
| [tailwind-css.md](frontend/tailwind-css.md) | 4.1.x | CSS-first config, design tokens |
| [tanstack-query.md](frontend/tanstack-query.md) | 5.75.x | Server state, SSR hydration |
| [zustand.md](frontend/zustand.md) | 5.0.x | Client UI state stores |
| [zod.md](frontend/zod.md) | 3.24.x | Runtime validation schemas |
| [shadcn-ui.md](frontend/shadcn-ui.md) | latest | Component primitives |
| [framer-motion.md](frontend/framer-motion.md) | 12.x | Micro-animations |
| [lucide-react.md](frontend/lucide-react.md) | 0.470.x | Icon library |
| [fetch-event-source.md](frontend/fetch-event-source.md) | 2.0.1 | POST SSE for Studio streaming |

## Backend (10 docs)

| Doc | Version | Purpose |
|-----|---------|---------|
| [fastapi.md](backend/fastapi.md) | 0.136.0 | API framework, lifespan, DI, SSE |
| [sqlalchemy-2-async.md](backend/sqlalchemy-2-async.md) | 2.0.40+ | ORM, async sessions, RLS |
| [alembic-async.md](backend/alembic-async.md) | 1.14.x | Async migrations, partitioning |
| [pydantic-v2.md](backend/pydantic-v2.md) | 2.10.x | Request/Response schemas |
| [asyncpg.md](backend/asyncpg.md) | 0.30.x | PostgreSQL async driver |
| [uv-python-package-manager.md](backend/uv-python-package-manager.md) | 0.6.x | Dependency management |
| [ruff.md](backend/ruff.md) | 0.8.x | Linter + formatter |
| [pytest-asyncio.md](backend/pytest-asyncio.md) | 0.24.x | Async testing |
| [arq.md](backend/arq.md) | 0.28.0 | Background job queue |
| [sse-starlette.md](backend/sse-starlette.md) | 2.2.x | Server-Sent Events |

## Database (4 docs)

| Doc | Version | Purpose |
|-----|---------|---------|
| [postgres-16.md](database/postgres-16.md) | 16.x | JSONB, UUID, CITEXT |
| [row-level-security.md](database/row-level-security.md) | PG 16 | Tenant isolation, CI check |
| [pg-partman.md](database/pg-partman.md) | 5.x | Automated partitioning |
| [redis-7.md](database/redis-7.md) | 7.x | Caching, jobs, rate limiting |

## AI (6 docs)

| Doc | Version | Purpose |
|-----|---------|---------|
| [openai-api.md](ai/openai-api.md) | v1 | GPT-4o, streaming, JSON mode |
| [anthropic-api.md](ai/anthropic-api.md) | v1 | Claude, prompt caching |
| [google-gemini-api.md](ai/google-gemini-api.md) | v1 | Gemini Pro/Flash |
| [litellm.md](ai/litellm.md) | 1.83.7 | Unified LLM interface |
| [prompt-caching-strategies.md](ai/prompt-caching-strategies.md) | — | Cross-provider caching |
| [token-optimization.md](ai/token-optimization.md) | — | Cost reduction techniques |

## Integrations (6 docs)

| Doc | Version | Purpose |
|-----|---------|---------|
| [clerk.md](integrations/clerk.md) | latest | Auth, orgs, JWT, webhooks |
| [resend.md](integrations/resend.md) | 2.x | Transactional email |
| [google-calendar-api-python.md](integrations/google-calendar-api-python.md) | v3 | Calendar events, OAuth |
| [google-oauth-setup.md](integrations/google-oauth-setup.md) | OAuth 2.0 | Consent screen setup |
| [stripe-subscriptions.md](integrations/stripe-subscriptions.md) | 11.x | Billing, webhooks |
| [sentry.md](integrations/sentry.md) | 2.x | Error tracking |

## Infrastructure (5 docs)

| Doc | Version | Purpose |
|-----|---------|---------|
| [docker-best-practices.md](infrastructure/docker-best-practices.md) | 27.x | Multi-stage builds |
| [docker-compose-production.md](infrastructure/docker-compose-production.md) | v2 | Dev/prod orchestration |
| [railway-deployment.md](infrastructure/railway-deployment.md) | — | Cloud deployment |
| [caddy-reverse-proxy.md](infrastructure/caddy-reverse-proxy.md) | 2.x | On-demand TLS, proxy |
| [github-actions-ci.md](infrastructure/github-actions-ci.md) | — | CI pipeline |

## Security (4 docs)

| Doc | Version | Purpose |
|-----|---------|---------|
| [owasp-checklist.md](security/owasp-checklist.md) | 2021 | Top 10 mitigations |
| [csp-for-generated-content.md](security/csp-for-generated-content.md) | — | Nonce-based CSP |
| [file-upload-security.md](security/file-upload-security.md) | — | Multi-layer validation |
| [rate-limiting-patterns.md](security/rate-limiting-patterns.md) | — | Redis rate limiter |

## Total: 45 reference documents
