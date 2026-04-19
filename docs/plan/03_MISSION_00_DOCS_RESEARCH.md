# MISSION 00 — Documentation Research & Compilation

**Goal:** Compile every piece of external documentation the coding agents will need into a single `docs/external/` folder so no downstream mission ever has to guess at an API or a library's current behavior. This mission runs before any code is written. The output of this mission is the reference library the rest of the project reads from.

**Branch:** `mission-00-docs`
**Estimated scope:** Research-heavy, no application code. One large documentation commit.
**Prerequisite:** A cloned empty repo with a `.gitignore` and a `README.md` stub. Nothing else.

---

## How To Run This Mission (Read Before Starting)

You are a coding agent. Your job here is not to write application code. Your job is to read the internet, pull down the authoritative documentation for every dependency and external service this project uses, and produce a local, searchable, well-organized `docs/external/` folder. Downstream missions will read these docs whenever they are unsure about an API or a library.

Follow this loop: **research → plan → todo list → execute → review → research again as needed.** Do not stop until every item in the todo list is verified complete. Do not stop until every item in the todo list is verified complete. Do not stop until every item in the todo list is verified complete. (Yes, three times. This mission is the foundation — if it is shallow, every downstream mission will struggle.)

Throughout this mission you will stage, commit, and push to GitHub in meaningful chunks. When you finish compiling the docs for a major section (for example, "all FastAPI docs"), commit and push. When you finish compiling the docs for an external service (Resend, Google Calendar, Stripe), commit and push. The history should tell the story of what was researched in what order. Commit messages should be descriptive: `docs(external): compile FastAPI, SQLAlchemy, and Alembic reference`. No "update docs" commits.

Reference the PRD (`02_PRD.md`) for the authoritative stack list. If the PRD is ambiguous about which library to use (e.g., arq vs Celery for background jobs; Clerk vs Auth.js for auth), research the tradeoffs, pick one, and document the choice with a short rationale in `docs/architecture/DECISIONS.md`. Lock these decisions here so downstream missions do not re-debate them.

---

## What To Produce

A `docs/` directory with this structure:

```
docs/
├── external/
│   ├── frontend/
│   │   ├── nextjs-16-app-router.md
│   │   ├── react-19.md
│   │   ├── tailwind-css.md
│   │   ├── tanstack-query.md
│   │   ├── zustand.md
│   │   ├── zod.md
│   │   ├── shadcn-ui.md
│   │   ├── framer-motion.md
│   │   ├── lucide-react.md
│   │   └── fetch-event-source.md
│   ├── backend/
│   │   ├── fastapi.md
│   │   ├── sqlalchemy-2-async.md
│   │   ├── alembic-async.md
│   │   ├── pydantic-v2.md
│   │   ├── asyncpg.md
│   │   ├── uv-python-package-manager.md
│   │   ├── ruff.md
│   │   ├── pytest-asyncio.md
│   │   ├── arq-or-celery.md         # whichever we pick
│   │   └── sse-starlette.md
│   ├── database/
│   │   ├── postgres-16.md
│   │   ├── row-level-security.md
│   │   ├── pg-partman.md
│   │   └── redis-7.md
│   ├── ai/
│   │   ├── openai-api.md
│   │   ├── anthropic-api.md
│   │   ├── google-gemini-api.md
│   │   ├── litellm-or-custom-adapter.md  # whichever we pick
│   │   ├── prompt-caching-strategies.md
│   │   └── token-optimization.md
│   ├── integrations/
│   │   ├── resend.md
│   │   ├── google-calendar-api-python.md
│   │   ├── google-oauth-setup.md
│   │   ├── stripe-subscriptions.md
│   │   ├── clerk-or-authjs.md       # whichever we pick
│   │   └── sentry.md
│   ├── infrastructure/
│   │   ├── docker-best-practices.md
│   │   ├── docker-compose-production.md
│   │   ├── railway-deployment.md
│   │   ├── caddy-reverse-proxy.md
│   │   └── github-actions-ci.md
│   └── security/
│       ├── owasp-checklist.md
│       ├── csp-for-generated-content.md
│       ├── file-upload-security.md
│       └── rate-limiting-patterns.md
├── architecture/
│   ├── DECISIONS.md                 # ADR-style decisions made during research
│   ├── DATA_MODEL_OVERVIEW.md       # high-level narrative of the schema
│   ├── AI_ORCHESTRATION.md          # expanded version of PRD §6 LLM Layer
│   ├── MULTI_TENANCY.md             # RLS strategy, session variables, CI checks
│   ├── PARTITIONING.md              # pg_partman setup, retention policies
│   └── OBSERVABILITY.md             # logging, metrics, tracing
└── runbooks/
    └── PLACEHOLDER.md               # populated in Mission 08
```

Every file in `docs/external/` contains:

1. **Version pinned.** The exact version of the library/service you researched. Example: `FastAPI 0.115.8`, `Next.js 16.2.4`. Pin to the latest stable at the time of research.
2. **The API surface we actually use.** Not the full reference dump. Curate aggressively to what Forge needs. If Forge uses `FastAPI`'s `Depends`, `BackgroundTasks`, `EventSourceResponse`, `HTTPException`, and middleware, document those specifically with code examples we can copy. Do not dump all of FastAPI.
3. **Known pitfalls.** Every library has gotchas. Document the ones relevant to our use case.
4. **Concrete code snippets**, copy-pasteable, using our naming conventions.
5. **Links to the official docs** so deeper questions can go upstream.

---

## Task Breakdown (Your TODO List)

Copy this list into your working scratchpad. Check off each item as you complete it. Do not skip.

### Phase 1 — Stack Verification and Decision-Locking

1. Read the PRD in full. Confirm the stack list. Flag any ambiguities.
2. Research and decide: `arq` vs `Celery` for background jobs. Criteria: Python-native, Redis-backed, async-friendly, low operational overhead for our scale. Document decision in `docs/architecture/DECISIONS.md` as ADR-001.
3. Research and decide: `Clerk` vs `Auth.js v5` for authentication. Criteria: speed to ship, multi-tenant org support, webhook reliability, cost at 10k users. Document as ADR-002.
4. Research and decide: custom LLM adapter vs `LiteLLM` vs `Bifrost`. Criteria: we need streaming, tool use, prompt caching, and the ability to add providers without touching callers. Document as ADR-003.
5. Research and decide: `pg_partman` vs manual declarative partitioning via Alembic. Document as ADR-004.
6. Confirm versions for every stack entry. Update PRD §4 if any pinned version has moved.

### Phase 2 — Frontend Docs

7. Next.js 16 App Router: cover routing, layouts, server components vs client components, server actions, streaming, middleware, metadata, typed routes, the new `next build` behavior without linting, and the `AGENTS.md` convention.
8. React 19.2 + React Compiler: what's stable, what to use, when NOT to use `useEffect`, when to prefer server components.
9. Tailwind CSS: the version that works with Next.js 16, `@apply` in our component layer, dark mode with `class` strategy, the custom palette we'll load from the designer.
10. Tanstack Query v5: hooks we use (`useQuery`, `useMutation`, `useInfiniteQuery`), query invalidation patterns, SSR hydration with Next.js App Router.
11. Zustand: store pattern with TypeScript, subscribing to selectors, persistence plugin for sidebar state.
12. Zod: schema-first validation, `z.infer`, discriminated unions for form field types, the pattern for sharing Zod schemas between FE and generated API types.
13. shadcn/ui: install flow, how we'll fork components for our theme, the current list of components we'll use (Button, Input, Textarea, Dialog, Sheet, Tabs, Toast, DropdownMenu, Avatar).
14. Framer Motion: `AnimatePresence`, `motion.div`, spring physics, layout animations, the one specific pattern we need for section-edit crossfade.
15. `@microsoft/fetch-event-source`: why we use it over native EventSource (POST support), the exact hook pattern for consuming SSE with POST body, reconnection behavior, AbortController.

### Phase 3 — Backend Docs

16. FastAPI: app factory pattern, `lifespan` context manager, dependency injection (`Depends`), `BackgroundTasks`, `EventSourceResponse` (v0.135+), middleware ordering, CORS, tenant middleware pattern.
17. SQLAlchemy 2.0 async: `AsyncSession`, `async_engine_from_config`, declarative models with `Mapped[T]`, relationships with `selectinload`, correct session-per-request pattern in FastAPI.
18. Alembic with async SQLAlchemy: the `env.py` async bridging pattern (this is a known trap — see the GitHub issue on it), `autogenerate`, importing all models, `NullPool` for migrations.
19. Pydantic v2: `BaseModel`, `ConfigDict`, validators (`@field_validator`, `@model_validator`), `model_dump()`, `model_validate()`, custom types, `Annotated` with `Field`.
20. asyncpg: connection pooling, prepared statements, listen/notify if relevant, timeout configuration.
21. uv: installing Python, creating venvs, `uv sync`, `uv add`, `uv run`, Dockerfile patterns.
22. Ruff: config, the rules we enable (`E`, `W`, `F`, `I`, `N`, `UP`, `B`, `SIM`, `C4`, `PT`, `RUF`), formatter integration.
23. pytest-asyncio: fixtures, async test patterns, the `asyncio_mode` config, how to get a fresh database per test via `pytest-postgresql` or a transaction rollback fixture.
24. arq (assuming Phase 1 picked it): job definition, worker lifecycle, retries with exponential backoff, cron jobs, result tracking.
25. sse-starlette / FastAPI's built-in `EventSourceResponse`: the `ServerSentEvent` API, `keepalive` pings, client disconnect detection, `X-Accel-Buffering: no` header.

### Phase 4 — Database and Data Layer

26. PostgreSQL 16: generic best practices for us — JSONB patterns, `gen_random_uuid()`, GIN indexes for JSONB fields we'll query (submission payloads), `CITEXT` for email fields.
27. Row-level security: `CREATE POLICY` syntax, `FORCE ROW LEVEL SECURITY`, `current_setting('app.current_tenant_id')`, non-superuser role strategy so RLS is not bypassed.
28. pg_partman: install as a PostgreSQL extension, `create_parent()` for time partitioning, maintenance job setup, retention policy configuration.
29. Redis 7: data structures we'll use (strings for rate limits with TTL, sorted sets for session state, lists for queues if using arq), `EXPIRE`, memory policies.

### Phase 5 — AI and LLM Layer

30. OpenAI API: Chat Completions endpoint, streaming, tool calling, JSON mode / structured outputs, the exact request/response shapes.
31. Anthropic API: Messages API, streaming event types (`message_start`, `content_block_delta`, `message_stop`), tool use, prompt caching with `cache_control`.
32. Google Gemini API: `generateContent` and `streamGenerateContent`, function declarations, JSON mode.
33. LiteLLM (or our custom adapter, if Phase 1 went that way): how to call each provider through the unified interface, how streaming normalizes, error taxonomy, cost tracking.
34. Prompt caching strategies across providers: what each provider offers, when to use it, the cost/latency math.
35. Token optimization: RAG practices, prompt trimming, using a cheap model for routing/parsing, structured output to avoid re-asking, the specific techniques we'll apply for section-targeted edits.

### Phase 6 — External Service Integrations

36. Resend: Python SDK, sending transactional emails, React Email component templates (we may use this for our email templates), webhook events (`email.delivered`, `email.bounced`, `email.complained`), domain verification, how to send from the user's verified domain on Pro plans.
37. Google Calendar API (Python): OAuth 2.0 web flow (not desktop flow — we need the web flow for our multi-user web app), the scopes we need (`calendar.events` primary), `events.insert`, `events.freebusy`, refresh tokens and their expiration, revoked token handling.
38. Google OAuth consent screen setup: dev vs production app verification, required privacy policy + ToS URLs, scope approval process.
39. Stripe: subscriptions, prices, customer portal, webhooks (`customer.subscription.created`, `customer.subscription.updated`, `invoice.payment_failed`), `stripe.Subscription.modify` for plan changes, idempotency keys.
40. Auth provider (Clerk or Auth.js per ADR-002): full integration flow, JWT verification in FastAPI middleware, webhook handling for user lifecycle, organization support.
41. Sentry: Python SDK for FastAPI, Next.js SDK, source map upload, release tagging, user context scoping to tenant.

### Phase 7 — Infrastructure and Deploy

42. Docker multi-stage builds: pattern for Python FastAPI with uv, pattern for Next.js with `output: standalone`, layer caching strategies, `.dockerignore`.
43. Docker Compose production vs development: healthchecks, restart policies, volume patterns, the split between `docker-compose.yml` and `docker-compose.prod.yml`.
44. Railway: how services work, private networking between services, `railway.json` config, environment variable management, custom domains on Railway, the build-pack vs Dockerfile trade-off (we use Dockerfile everywhere).
45. Caddy: reverse proxy config for custom tenant domains, automatic HTTPS, the `on_demand_tls` feature with an ask-url for domain verification (needed so we don't get certs for arbitrary domains).
46. GitHub Actions: the CI workflow (lint → typecheck → test → build), caching pnpm and uv dependencies, matrix strategy, PR vs main branch workflows, secrets management.

### Phase 8 — Security

47. OWASP Top 10 applied to Forge: for each item (injection, broken auth, sensitive data exposure, XXE, broken access control, misconfiguration, XSS, insecure deserialization, known-vuln components, insufficient logging) document the specific mitigation in our codebase.
48. CSP for user-generated pages: how to set a strict Content-Security-Policy on pages Forge serves publicly, allowing only our own stylesheet/scripts, no inline script except a single submission handler (or a nonce-based pattern).
49. File upload security: MIME sniffing vs declared type, max file size enforcement at multiple layers, virus scan hook, renaming to UUIDs, serving via presigned URLs only.
50. Rate limiting: token bucket vs sliding window, Redis implementation, per-IP vs per-user limits, exempting auth'd paid users from certain limits.

### Phase 9 — Architecture Documents

51. Write `docs/architecture/DECISIONS.md` with all ADRs from Phase 1 plus any other decisions made during research (e.g., "we use JSONB for form schemas because they're small and evolve freely").
52. Write `docs/architecture/DATA_MODEL_OVERVIEW.md` as a narrative walkthrough of the schema — not the DDL (that lives in Mission 01), but the story of how the tables relate.
53. Write `docs/architecture/AI_ORCHESTRATION.md` as the expanded version of PRD §6 — pipeline diagram, prompt design, component library strategy, token budget per operation, fallback chain, observability hooks.
54. Write `docs/architecture/MULTI_TENANCY.md` — exact RLS strategy, session variable pattern, FastAPI middleware pseudocode, CI check requirements for new tables.
55. Write `docs/architecture/PARTITIONING.md` — pg_partman setup steps, retention policies per plan tier, migration coordination.
56. Write `docs/architecture/OBSERVABILITY.md` — structured logging format, what gets logged vs what gets Sentry'd, metrics we want (req count, LLM token usage per tenant, submission count per page).

### Phase 10 — Cross-References and Verification

57. Every doc file has a header: `# <Library/Service> — Reference for Forge` followed by "Version: X.Y.Z" and "Last researched: YYYY-MM-DD".
58. Every doc file has at least one code snippet that is directly copyable into our app.
59. Build a top-level `docs/external/README.md` that is an index — which doc covers what, which missions reference which doc.
60. For each library/service, verify you used the current latest stable (not beta, not deprecated).
61. Spot-check five random docs against the live upstream documentation to verify you didn't hallucinate.
62. Commit the entire `docs/` folder with message `docs: initial research compilation (Mission 00)` and push to `main` (this is the only mission that pushes directly to main; everything else is branch-based).

---

## Acceptance Criteria

- Every item on the TODO list is checked off.
- Every `docs/external/*.md` file exists with version pinned, curated API surface, pitfalls, code snippets, and links.
- `docs/architecture/DECISIONS.md` contains at least ADR-001 through ADR-004 from Phase 1.
- `docs/architecture/AI_ORCHESTRATION.md` is a complete design document, not a stub.
- `docs/external/README.md` exists and serves as a navigable index.
- Mission completion is reported in `docs/missions/MISSION-00-REPORT.md` summarizing what was researched, what decisions were locked, and any deferred questions.

---

## What Downstream Missions Assume About This Mission

- Mission 01 will reference `docs/architecture/DATA_MODEL_OVERVIEW.md` and the ADRs when scaffolding the schema.
- Mission 03 will reference `docs/architecture/AI_ORCHESTRATION.md` and `docs/external/ai/*` when building the orchestration layer.
- Mission 05 will reference `docs/external/integrations/*` for Resend and Google Calendar.
- Mission 07 will reference `docs/external/security/*` during the polish sweep.
- Mission 08 will reference `docs/external/infrastructure/railway-deployment.md` and the Caddy doc when deploying.

If any of these downstream missions find that their referenced doc is missing a detail they need, the fix is to go back and extend the doc — not to skip it or guess. The agent executing this mission sets the quality bar for every mission after it.

---

## Repo tracking (living)

**`docs/external/`** and **`docs/architecture/`** are the deliverables; completeness vs repo expectations: **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** (Mission 00 row).

---

## Final Reminders (Three Times, Because They Matter)

**Do not stop until every item in the TODO list is verified complete.**
**Do not stop until every item in the TODO list is verified complete.**
**Do not stop until every item in the TODO list is verified complete.**

Commit and push to GitHub regularly. Small, meaningful commits beat one giant commit. The future you (and every downstream agent) will thank this-you for leaving a clean trail.
