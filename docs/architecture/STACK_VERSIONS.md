# Stack Version Lock — Forge

**Locked:** 2026-04-18 (Mission 00 verification pass)
**Author:** Forge Engineering

## Purpose
This document pins every dependency version for Forge. All agents and engineers must use these exact versions or compatible ranges. No version bumps without an ADR update.

## Frontend

| Package | Version | Notes |
|---------|---------|-------|
| Next.js | 16.2.4 | App Router, Turbopack default, Cache Components |
| React | 19.2.4 | Matches `apps/web`; React Compiler stable |
| TypeScript | 5.7.x | Strict mode enabled |
| Tailwind CSS | 4.1.x | CSS-first config, `@theme` directive |
| @clerk/nextjs | 7.2.3 | Org support, JWT auth (add at Mission 02) |
| @tanstack/react-query | 5.75.x | Server state, SSR hydration |
| zustand | 5.0.x | Client UI state |
| zod | 3.24.x | Runtime validation |
| framer-motion | 12.x | Micro-animations |
| lucide-react | 0.470.x | Icons |
| @microsoft/fetch-event-source | 2.0.1 | POST SSE support |
| shadcn/ui | latest (copied, not versioned) | Component primitives |
| sonner | latest | Toast notifications |
| pnpm | 9.x | Package manager |

## Backend

| Package | Version | Notes |
|---------|---------|-------|
| Python | 3.12.x | async-native, match-case |
| FastAPI | 0.136.0 | Lifespan, DI, SSE |
| Uvicorn | 0.34.x | ASGI server |
| SQLAlchemy | 2.0.40+ | Async + Mapped[T] |
| asyncpg | 0.30.x | PostgreSQL async driver |
| Alembic | 1.14.x | Async migrations |
| Pydantic | 2.10.x | v2 API |
| pydantic-settings | 2.7.x | .env loading |
| LiteLLM | 1.83.10 | LLM abstraction (pin exact; avoid 1.82.7–1.82.8) |
| arq | 0.28.0 | Background jobs |
| redis | 5.2.x | Async Redis client |
| httpx | 0.28.x | Async HTTP client |
| resend | 2.x | Transactional email |
| stripe | 11.x | Billing |
| python-jose[cryptography] | 3.3.x | JWT verification |
| sse-starlette | 2.2.x | SSE responses |
| sentry-sdk[fastapi] | 2.x | Error tracking |
| python-multipart | 0.0.18+ | File uploads |
| uv | 0.6.x | Package manager |
| Ruff | 0.8.x | Linter + formatter |
| pytest | 8.x | Testing |
| pytest-asyncio | 0.24.x | Async test support |

## Infrastructure

| Component | Version | Notes |
|-----------|---------|-------|
| PostgreSQL | 16-alpine | JSONB, RLS, gen_random_uuid() |
| pg_partman | 5.x | Automated partitioning |
| Redis | 7-alpine | Jobs, cache, rate limiting |
| Docker | 27.x | Container runtime |
| Docker Compose | v2 | Local orchestration |
| MinIO | latest | S3-compatible file storage (dev) |
| Caddy | 2.x | Reverse proxy, on-demand TLS |
| Node.js | 20.x | Frontend runtime |

## Security Constraints

- **LiteLLM exact pin**: Due to March 2026 supply chain incident, always verify package integrity. Never use 1.82.7 or 1.82.8.
- **Lockfiles committed**: Both `uv.lock` and `pnpm-lock.yaml` must be committed and used with `--frozen` in CI/Docker.
- **Dependabot/Renovate**: Enable for automated security patches.
