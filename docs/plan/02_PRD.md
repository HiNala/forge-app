# FORGE — Project Reference Document (PRD)

**Project:** Forge — AI-Powered Mini-App Builder
**Owner:** Digital Studio Labs / Brian
**Document Purpose:** The single source of truth for what Forge is, how it works, what it is built on, and how every piece fits together. This document is the bible. All missions reference it. No agent should ever have to guess what something means.
**Version:** 1.1
**Status:** Active development — stack and ADRs from Mission 00 apply; **living** completion vs this document is tracked in [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) and [ui/FRONTEND_STATUS.md](./ui/FRONTEND_STATUS.md).

---

## 1. Executive Summary (Plain English)

Forge is a web application that turns a plain-English prompt into a finished, hosted, single-purpose web page — a booking form, a contact form, an event RSVP, a daily menu, a sales proposal, a promotional landing page — and gives the creator of that page an admin surface to manage it afterward. The paying user describes what they need, watches the page appear, clicks on the parts they want to change, refines, publishes. The end customer who fills out the form never sees Forge; they see a clean, branded, mobile-friendly page. When they submit, the paying user gets a notification email, an optional calendar event, and a managed record in their Forge admin. That is the whole product.

Forge has a deliberate focus that makes it different from Lovable, Bolt, v0, and the other AI-app-builder tools: **it only builds pages, not full applications.** This narrower scope is a feature, not a limitation. It means the AI orchestration can be far simpler and cheaper. It means the output is predictable and high-quality. It means a single shared multi-tenant database can serve every tenant's submissions, analytics, and configuration. It means a token-efficient architecture is possible because we never have to generate entire codebases — only self-contained HTML/CSS pages with a small JavaScript submission handler.

The stack is Next.js 16 (App Router, TypeScript, Tailwind CSS) on the frontend, Python 3.12 with FastAPI on the backend, PostgreSQL 16 as the primary database with pg_partman-style time partitioning on high-volume tables, Redis 7 for cache and background job queuing, MinIO (or S3 in production) for file storage, Resend for transactional email, Google Calendar API for calendar integration, and a provider-abstracted LLM layer that starts with OpenAI and extends to Anthropic and Google Gemini via a thin unified adapter. Everything is containerized with Docker, orchestrated with Docker Compose locally, and deployed to Railway in production. GitHub hosts the code; CI is GitHub Actions.

The design is handled separately by a dedicated designer; this document does not specify visual design but does specify the UI behaviors, interaction patterns, and information architecture that the design must express.

---

## 2. Product Positioning

Forge sits between three familiar product categories and intentionally occupies the gap:

**Google Forms / Typeform:** These are form builders. Forge is that and more — it generates a full branded page around the form, not just the form itself. The admin, brand kit, calendar sync, and proposal/menu/landing-page variants put Forge a tier above.

**Lovable / Bolt / v0:** These generate full web applications with frontend and backend logic. Forge is deliberately smaller. It only generates pages, and those pages never need a custom backend because Forge hosts the submission endpoint, admin, and integrations. This allows Forge to be faster, cheaper, and dramatically more reliable than full-app generators.

**Squarespace / Webflow / Wix:** These are website builders — powerful, but heavy and requiring the user to think visually. Forge is prompt-first — the user describes, does not design — and each Forge page is a unit, not a site. You build a small jobs page today, a promo page tomorrow. Each is a discrete, managed artifact.

The primary user is an administrative or creative professional: Lucy from Reds Construction, a photographer, a small-business owner, a freelance consultant. The secondary user is the customer who fills out the form — that experience is the most public surface and is treated with equal care.

---

## 3. Scope — What Is In, What Is Out

### In Scope for 1.0

- User signup and authentication (email + password, Google SSO via **Clerk** — see ADR-002)
- Organization-based multi-tenancy with Owner / Editor / Viewer roles
- Brand Kit per organization (logo, primary + secondary colors, fonts, voice note)
- Studio chat interface for creating and refining pages
- Section-targeted editing in the live preview
- Page publishing with subdomain URLs (`workspace.forge.app/slug`) and custom domain support
- Form submission endpoint with validation, file uploads, and idempotency
- Admin panel per page: Overview, Submissions, Automations, Analytics
- Automations: notify-on-submit email, confirm-to-submitter email, Google Calendar sync
- Analytics: page views, unique visitors, section dwell (for proposals), CTA clicks, submission rate, funnel drop-off on forms
- Email via Resend (notifications, confirmations, replies, invitations)
- Google Calendar integration (OAuth, event creation, invites)
- Billing via Stripe (trial, starter, pro, cancel)
- Team invitations and RBAC
- Multi-provider LLM layer (OpenAI primary; Anthropic and Gemini ready to enable)
- Docker Compose local dev; Railway production deploy; GitHub CI/CD

### Out of Scope for 1.0

- Apple Calendar integration (shown in UI as "coming soon"; backend stub present)
- Slack, Zapier, webhook integrations (shown as "coming soon")
- Template marketplace (reserved for the final mission as a post-launch enhancement)
- Mobile native app (Forge is web-only in 1.0)
- Multi-page sites (each Forge page is a single unit; a group of related pages is a future feature)
- A/B testing on generated pages
- Custom CSS injection by end users
- SDK / programmatic API for third-party integration
- White-label reseller mode

---

## 4. Tech Stack — The Full Picture

### Frontend

- **Next.js 16** with the App Router, Turbopack, TypeScript strict mode, React 19.2
- **Tailwind CSS** for utility-first styling
- **Tanstack Query (React Query)** for server state
- **Zustand** for lightweight client state (sidebar collapse, Studio session state)
- **Zod** for schema validation, shared between frontend and generated types
- **shadcn/ui** as the base component library for primitives (extended and re-themed to match Forge's design system)
- **Framer Motion** for micro-interactions and the crossfade-on-section-edit animation
- **Lucide React** for iconography
- **fetch-event-source** (Microsoft) for SSE streaming from the backend (native EventSource does not support POST with payloads)

### Backend

- **Python 3.12** with **FastAPI** (pinned to **0.136.x** in Mission 01 — see `docs/architecture/STACK_VERSIONS.md`)
- **SQLAlchemy 2.0 async** with **asyncpg** driver
- **Alembic** for migrations (configured for async)
- **Pydantic v2** for request/response validation
- **uv** for dependency management (faster than pip, reproducible lockfiles)
- **Ruff** for linting and formatting (replaces Black + Flake8 + isort)
- **pytest** and **pytest-asyncio** for tests
- **httpx** for outbound HTTP (Resend, Google Calendar, LLM providers)
- **arq** for background jobs (ADR-001; Redis-backed async workers)
- **sse-starlette** for SSE (FastAPI's native `EventSourceResponse` if on ≥0.135)

### Data & Infrastructure

- **PostgreSQL 16** as primary database
- Row-level security (RLS) for tenant isolation on all tables with `organization_id`
- Time-partitioned tables (monthly) for `analytics_events` and `submissions` via **pg_partman** (ADR-004)
- **Redis 7** for: response cache, rate limiting counters, background job queue, SSE session state
- **MinIO** (local) / **AWS S3** or **Cloudflare R2** (production) for file uploads
- **Caddy** as a reverse proxy in production for automatic HTTPS on custom domains

### Third-Party Services

- **Resend** for transactional email
- **Google Calendar API** for calendar integration
- **Stripe** for billing
- **Clerk** for authentication (ADR-002; `@clerk/nextjs` with Organizations)
- **Sentry** for error tracking
- **PostHog** for product analytics (internal, separate from the analytics shown to users about their own pages)

### AI / LLM Layer

- Unified provider abstraction via **LiteLLM** (SDK in-process; ADR-003) that normalizes OpenAI, Anthropic, and Google Gemini behind a common interface
- Dual-tier model strategy: a **heavy model** (GPT-4o / Claude Opus 4.7 / Gemini 2.5 Pro) for first-time page generation and complex full-page edits; a **fast model** (GPT-4o-mini / Claude Haiku 4.5 / Gemini Flash) for section edits, refinement chips, and autocomplete
- Prompt caching and session-level context reuse to minimize cost
- Streaming via SSE for real-time preview updates
- Default provider at launch: **OpenAI** (per Brian's instruction)

### DevOps

- **Docker** and **Docker Compose** for local dev
- **Railway** for production deploy (separate services for frontend, backend, workers, postgres, redis, minio-to-s3)
- **GitHub Actions** for CI (lint, typecheck, test, build)
- **pnpm** as the frontend package manager (faster, more reliable than npm for monorepos)

---

## 5. Repository Structure

The repository is a monorepo managed with pnpm workspaces.

```
forge/
├── apps/
│   ├── web/                    # Next.js 16 frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (marketing)/    # Public landing pages
│   │   │   │   ├── (app)/          # Authenticated app
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── studio/
│   │   │   │   │   ├── pages/[pageId]/
│   │   │   │   │   ├── settings/
│   │   │   │   │   └── analytics/
│   │   │   │   ├── (public)/       # Serves generated pages at /p/[slug]
│   │   │   │   └── api/            # Thin proxy routes to backend
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── types/
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── tsconfig.json
│   │   └── tailwind.config.ts
│   ├── api/                    # FastAPI backend
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── config.py
│   │   │   ├── db/
│   │   │   │   ├── base.py
│   │   │   │   ├── session.py
│   │   │   │   ├── models/     # One file per model
│   │   │   │   └── partitioning.py
│   │   │   ├── api/
│   │   │   │   └── v1/
│   │   │   │       ├── auth.py
│   │   │   │       ├── pages.py
│   │   │   │       ├── studio.py   # SSE generation endpoint
│   │   │   │       ├── submissions.py
│   │   │   │       ├── automations.py
│   │   │   │       ├── analytics.py
│   │   │   │       ├── brand.py
│   │   │   │       ├── team.py
│   │   │   │       ├── billing.py
│   │   │   │       └── templates.py
│   │   │   ├── services/
│   │   │   │   ├── ai/             # LLM provider abstraction
│   │   │   │   │   ├── base.py
│   │   │   │   │   ├── openai_provider.py
│   │   │   │   │   ├── anthropic_provider.py
│   │   │   │   │   ├── gemini_provider.py
│   │   │   │   │   └── router.py
│   │   │   │   ├── orchestration/  # Page generation pipeline
│   │   │   │   │   ├── intent_parser.py
│   │   │   │   │   ├── page_composer.py
│   │   │   │   │   ├── section_editor.py
│   │   │   │   │   └── prompts/    # System prompts + component library
│   │   │   │   ├── email.py
│   │   │   │   ├── calendar.py
│   │   │   │   ├── stripe.py
│   │   │   │   └── storage.py
│   │   │   ├── schemas/            # Pydantic schemas
│   │   │   ├── middleware/         # Tenant, auth, rate limit
│   │   │   ├── workers/            # Background jobs
│   │   │   └── utils/
│   │   ├── alembic/
│   │   │   ├── versions/
│   │   │   └── env.py
│   │   ├── tests/
│   │   ├── pyproject.toml
│   │   ├── Dockerfile
│   │   └── alembic.ini
│   └── worker/                 # Separate worker service container
│       ├── worker.py
│       └── Dockerfile
├── packages/                   # Shared code
│   ├── types/                  # Shared TypeScript types (generated from Pydantic)
│   └── eslint-config/
├── docs/                       # Compiled external docs + internal docs
│   ├── external/               # Scraped/fetched external docs
│   ├── architecture/
│   ├── api/                    # API contract mirror
│   └── runbooks/
├── infra/
│   ├── railway.json            # Railway config
│   └── caddy/                  # Caddy config for custom domains
├── docker-compose.yml          # Local dev orchestration
├── docker-compose.prod.yml     # Reference production compose
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── .env.example
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## 6. Architecture Overview

The architecture is three tiers: a Next.js frontend, a FastAPI backend, and a PostgreSQL/Redis/MinIO data layer. A separate worker service runs background jobs. An LLM orchestration layer sits in the backend as a distinct service module.

### Request Paths

**Studio page generation (user prompts → page):**

1. Frontend captures the prompt in the Studio input and calls `POST /api/v1/studio/generate` with the prompt, an optional `pageId` (for refinement), and a `sessionId`.
2. The backend authenticates, checks tenant context, and opens an SSE stream.
3. The orchestration layer runs: Intent Parser (fast model, extracts structured page intent) → Page Composer (heavy model, generates HTML) → Validator (AST-parses the HTML, catches malformed output, retries once).
4. Output is streamed back chunk by chunk. The frontend's SSE consumer appends chunks to the live preview iframe.
5. On completion, the backend persists a Page (or PageVersion) row and returns the final URL.

**Section edit (click on section → prompt → patched HTML):**

1. Frontend sends `POST /api/v1/pages/{id}/sections/edit` with the section ID, current HTML of that section only, and the user's instruction.
2. Backend uses the fast model with a minimal system prompt and the single section. Token cost is 10× cheaper than a full-page edit.
3. Returns the patched section HTML. Frontend splices into the preview.

**Form submission (end customer → Forge → automations):**

1. The generated page's tiny JS handler posts to `POST /p/{slug}/submit` (a public endpoint on the backend, no auth but rate-limited by IP).
2. Backend validates against the Page's Form schema, stores files via presigned S3, records a Submission row.
3. Backend enqueues an automation job on Redis. The worker picks it up, runs notify → confirm → calendar in sequence.
4. Responds 200 to the end customer immediately; automations are async.

### Data Isolation Strategy

Forge uses the **pooled multi-tenant model with PostgreSQL Row-Level Security**. Every row that belongs to a tenant has an `organization_id` column. RLS policies enforce that a session can only see rows where `organization_id = current_setting('app.current_tenant_id')`. The FastAPI middleware sets this session variable from the authenticated user's active organization on every request.

This model was chosen because (a) the product's workload is highly uniform — every tenant does roughly the same things at small scale; (b) migrations are one-execution-all-tenants; (c) the cost at 10,000 tenants is a fraction of schema-per-tenant; (d) RLS gives us a safety net beyond application-level tenant filtering, so even a forgotten `.where(org_id=...)` clause doesn't leak data. Every new table with an `organization_id` column must have an RLS policy, enforced by a CI check in Mission 06.

### Partitioning Strategy

Two tables will grow unboundedly: `analytics_events` and `submissions`. Both are partitioned by month.

- `analytics_events`: List-partitioned by `organization_id` is overkill for MVP. Instead, range-partition by `created_at` monthly. Drop partitions older than 90 days (configurable per plan tier) via a background job.
- `submissions`: Range-partition by `created_at` monthly. Retention is permanent (tenants want their data).

pg_partman is the tool of choice; it handles partition creation ahead of time. The migration strategy is documented in the API Contracts document.

### LLM Orchestration Layer

This is the heart of Forge. The goal is to be token-efficient, reliable, and provider-portable. The full design lives in the dedicated AI Orchestration Mission, but the shape:

- **Provider Adapter interface** — one class per provider, all implementing `generate()`, `stream()`, `embed()`. Normalized input schema (OpenAI-style messages), normalized output schema.
- **Router** — selects provider + model based on task (intent / compose / section-edit), configuration, and fallback chains. Records per-request token usage and cost.
- **Intent Parser** — fast model, small prompt, returns JSON describing the intent (page_type, fields, tone, brand overrides, inspirations).
- **Page Composer** — heavy model, takes the parsed intent + brand kit + a component library reference, outputs a complete HTML page as a single document.
- **Section Editor** — fast model, takes a single section's HTML + edit instruction, returns the patched section.
- **Validator** — parses output HTML with a tolerant parser, checks for required structure (form element if it's a form page, etc.), returns errors.
- **Prompt Cache** — Redis-backed cache for identical prompts within a short window; saves cost when a user re-clicks a suggestion chip.
- **Component Library** — a curated set of reusable HTML/CSS blocks the LLM is instructed to compose from (hero, form-vertical, form-inline, cta-bar, pricing-3col, testimonial, gallery-grid, menu-list, proposal-section). This dramatically improves output quality and reduces tokens because the model doesn't re-invent CSS every time.

---

## 7. Design Philosophy Reference

The design is being handled by a separate Claude instance. Development should not override the designer's visual choices. However, development must respect these cross-cutting behaviors that emerged from the design conversation and must be present regardless of what the visual layer looks like:

- **Sidebar collapse** — persisted per user via localStorage + sync to server on change
- **Single-source navigation** — no nested sidebars; Settings uses a horizontal tab strip
- **Studio empty-state and active-state** — the sidebar auto-collapses when Studio is in split-screen mode
- **Section-click editing** — a generic overlay system that works on any generated page regardless of its visual design
- **Open in new tab** — every preview has this affordance; uses a real URL (not a blob)
- **Micro-interactions** — button presses, card lifts, input focus rings, screen fade-ins, dot-pulse loading, confetti on first page publish (subtle)
- **No fake metrics** — no hardcoded stats anywhere; only real numbers from the database
- **Real iframe previews** — use `<iframe srcDoc>` with sandboxing, not `dangerouslySetInnerHTML`
- **Warm, light default palette** — cream/beige background, accent color from the designer (most recent direction: warm teal `oklch(50% 0.15 192)`); dark Studio panel in split-screen mode

When the design arrives, it should slot into the component structure without requiring architectural changes. If it does require architectural changes, those are flagged and handled in the polish mission.

---

## 8. Key Invariants (Rules That Never Bend)

- Every database row that belongs to a tenant has an `organization_id` and an RLS policy
- Every API endpoint that accesses tenant data goes through the tenant middleware and verifies the user's role
- Every file in the backend stays under 400 lines; files over 400 lines must be split
- Every Pydantic schema has an explicit example for the OpenAPI docs
- Every external API call (Resend, Google, LLM, Stripe) has a timeout and a retry policy
- Every background job is idempotent — re-running it does not double-send emails or double-create events
- Every generated HTML page passes the validator before being saved
- Every migration has a down-migration
- Every env var is documented in `.env.example`
- No secret is ever committed to git; GitHub secrets scanning is enabled
- No `console.log` or `print` in production code; structured logging only

---

## 9. Environment Variables (Authoritative List)

Every variable documented here must appear in `.env.example`.

```
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Backend
ENVIRONMENT=development               # development | staging | production
DATABASE_URL=postgresql+asyncpg://forge:forge@postgres:5432/forge
REDIS_URL=redis://redis:6379/0
SECRET_KEY=                           # 64-byte random, generated per env
CORS_ORIGINS=http://localhost:3000

# Auth
AUTH_PROVIDER=clerk                   # clerk | authjs — decided in docs mission
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# LLM Providers
LLM_DEFAULT_PROVIDER=openai           # openai | anthropic | gemini
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# Storage
STORAGE_PROVIDER=minio                # minio | s3
S3_ENDPOINT=http://minio:9000
S3_BUCKET=forge-uploads
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_REGION=us-east-1

# Email
RESEND_API_KEY=
EMAIL_FROM=noreply@forge.app
EMAIL_REPLY_TO=support@forge.app

# Calendar
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/calendar/callback

# Billing
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO=
STRIPE_PRICE_STARTER=

# Monitoring
SENTRY_DSN=
LOG_LEVEL=INFO
```

---

## 10. Performance and Scale Targets

- **Page generation (first-time):** p50 < 10s, p95 < 20s.
- **Section edit:** p50 < 3s, p95 < 6s.
- **Submission endpoint:** p50 < 200ms (submission stored), p95 < 500ms. Automations async.
- **Generated page Lighthouse score:** ≥ 95 on mobile for forms; ≥ 90 for proposals/galleries.
- **Generated page weight:** < 80KB initial load (HTML + inline CSS + tiny JS).
- **Initial scale target:** 10,000 tenants, 1M submissions, 10M analytics events per month. The architecture supports this on a single Railway region.
- **Cost target per tenant per month:** < $0.50 in infrastructure + LLM for a free-tier user making one page.

---

## 11. Security Posture (MVP-level, expand in Polish mission)

- HTTPS everywhere (Railway handles; custom domains via Caddy/Let's Encrypt)
- Auth tokens in HttpOnly cookies, not localStorage
- CSRF protection on mutating routes
- Input validation via Pydantic on every endpoint
- Rate limiting: 60 req/min per IP on public endpoints, 200 req/min per user on auth'd endpoints, 10 req/min per IP on submission endpoints
- SQL injection protection via SQLAlchemy parameterization (never string-format queries)
- XSS protection on generated pages via strict CSP headers; all user-supplied fields are HTML-escaped before rendering
- File upload validation: mime type sniffing, max size, virus scan stub (actual AV integration post-MVP)
- RLS enforced at the database for tenant isolation
- Secret key rotation procedure documented in the ops runbook
- Sentry for error tracking, no PII in error payloads
- GDPR: account delete purges within 30 days; analytics events anonymize IP after 30 days

---

## 12. Mission Map

Nine missions total, executed in this order:

| # | Mission | Goal |
|---|---------|------|
| 0 | **Documentation Research** | Scrape and compile all external docs into `docs/external/` |
| 1 | **API Contracts & Database Schema** | Fully specify every endpoint, every table, every migration, then scaffold both apps |
| 2 | **Foundation: Auth, Multi-Tenancy, Brand Kit** | Users, orgs, RLS, sign-in, workspace switcher, brand kit |
| 3 | **Studio & AI Orchestration** | Studio UI, SSE streaming, LLM provider abstraction, intent parsing, page composer, section editor |
| 4 | **Live Pages & Submissions** | Page publishing, public submission endpoint, file uploads, submission admin table |
| 5 | **Automations & Integrations** | Resend email (notify, confirm, reply), Google Calendar OAuth + event creation, rule engine |
| 6 | **Analytics, Billing, Teams** | Analytics events, dashboards, Stripe billing, team invitations and RBAC |
| 7 | **Polish & Production Readiness** | Full PRD compliance sweep, lint/typecheck/test all-green, performance, security, accessibility |
| 8 | **Railway Deployment** | Production Railway deploy, custom domains, monitoring, alerting, runbooks |
| 9 | **Templates** | Curated template library (post-core-launch feature) |

Each mission ends with a functional application core. The product is shippable (at some level) after every mission starting from Mission 4.

---

## 13. Definition of Done (Applied to Every Mission)

A mission is done when:

1. All acceptance criteria in the mission document are met.
2. `pnpm lint`, `pnpm typecheck`, `pnpm test` all pass across the monorepo.
3. `docker compose up --build` from a clean clone succeeds and all services pass health checks.
4. Mission-specific new features have integration tests.
5. Mission changes are committed to a feature branch and pushed to GitHub with meaningful commit messages.
6. A mission report is written to `docs/missions/MISSION-XX-REPORT.md` listing what was done, what was deferred, and why.
7. No mission introduces regressions in previous missions' acceptance criteria.
