# Architecture Decision Records (ADRs)

## ADR-001: arq for Background Jobs (over Celery)

**Status:** Accepted
**Date:** 2026-04-19
**Context:** Forge needs an async background job system for: sending notification emails, sending confirmation emails, creating calendar events, cleanup of old page revisions, and dropping old analytics partitions.

**Decision:** Use **arq v0.28.0**.

**Rationale:**
- **Async-native:** arq is built on asyncio, which is a perfect match for our FastAPI + asyncpg stack. No need for process-forking overhead.
- **Redis-only:** We already run Redis 7 for caching and rate limiting. arq requires no additional broker.
- **Lightweight:** Minimal configuration overhead. A job is just an async function with a decorator.
- **Retries with backoff:** Built-in retry mechanism with exponential backoff, which we need for email/calendar idempotency.
- **Scale is appropriate:** Forge's workload at 10k tenants does not require Celery's distributed computing features (multi-broker, complex routing, Flower monitoring).

**Risks:**
- arq is in "maintenance only" mode as of 2026. However, it is stable and our use case is simple.
- No built-in monitoring dashboard (Celery has Flower). We mitigate with structured logging and Sentry.

**Alternatives rejected:**
- **Celery:** Overkill for our workload. Process-based (not async-native), complex configuration, requires separate beat process for cron jobs.
- **FastAPI BackgroundTasks:** Too simple — no retry, no persistence if the process crashes mid-job, no cron scheduling.

---

## ADR-002: Clerk for Authentication (over Auth.js v5)

**Status:** Accepted
**Date:** 2026-04-19
**Context:** Forge requires signup/login (email + Google SSO), organization-based multi-tenancy, team invitations, and RBAC (Owner/Editor/Viewer).

**Decision:** Use **Clerk** (`@clerk/nextjs`).

**Rationale:**
- **Organizations are built-in:** Clerk's Organizations primitive maps directly to our multi-tenant model — org creation, switching, member invitations, role management. This saves 2-3 weeks of development vs building from scratch with Auth.js.
- **Speed to ship:** Pre-built sign-in/sign-up UI components, SSO integration, and webhook infrastructure accelerate delivery.
- **JWT verification in FastAPI:** Clerk issues standard JWTs signed with RS256 with JWKS endpoint. Our FastAPI `auth.py` middleware verifies these without coupling to Clerk's SDK.
- **Webhook reliability:** Clerk webhooks (Svix-backed) provide delivery guarantees for user lifecycle events.
- **Next.js 16 integration:** Clerk's SDK is actively maintained for the App Router.

**Cost at scale:**
- Free tier covers up to 10,000 MAUs.
- At our initial target of 10k tenants, we'll likely stay within the free tier or early paid tier.
- B2B features (enhanced organizations, custom roles) may require paid plans. Budget for this.

**Risks:**
- Vendor lock-in: user data is stored on Clerk's servers. Mitigated by syncing a canonical User row to our database on every webhook event.
- Auth.js community is moving to Better Auth — Clerk is the safer bet for stability.

**Alternatives rejected:**
- **Auth.js v5:** No built-in organization support, effectively in maintenance mode, would require building org/team/RBAC from scratch.
- **Better Auth:** Promising but too new for a production launch; less battle-tested.

---

## ADR-003: LiteLLM for LLM Provider Abstraction (over Custom Adapter)

**Status:** Accepted
**Date:** 2026-04-19
**Context:** Forge needs a unified interface to call OpenAI, Anthropic, and Google Gemini with streaming, tool calling, and JSON mode support. Must be provider-swappable without changing application code.

**Decision:** Use **LiteLLM v1.83.10** as SDK (not proxy mode), pinned in `uv.lock`.

**Rationale:**
- **Unified API:** OpenAI-compatible `completion()` interface that works with 100+ providers. We switch models by changing a string, not rewriting code.
- **Streaming normalization:** Stream format is consistent across providers — critical for our SSE pipeline.
- **Token tracking:** Built-in token usage and cost tracking per request, which feeds our `subscription_usage` table.
- **Prompt caching support:** Supports Anthropic's `cache_control` and OpenAI's automatic caching natively.
- **Day-0 model support:** New models from each provider are supported quickly.
- **Mature:** 60k+ GitHub stars, actively developed, large community.

**Security note:** LiteLLM had a supply chain compromise in March 2026 (versions 1.82.7-1.82.8). Current patched lines (1.83.0+) include security hardening. We pin to **1.83.10** and verify checksums in CI.

**Architecture:**
- We use LiteLLM as a thin SDK layer inside our `app/services/ai/` module.
- We wrap it in our own `LLMProvider` protocol class for testability and to add Forge-specific concerns (tenant-scoped token tracking, retry budgets, prompt cache management).
- We do NOT use the LiteLLM proxy server — our orchestration layer handles routing internally.

**Alternatives rejected:**
- **Custom adapter from scratch:** Would require maintaining API compatibility with 3 providers as they evolve. High ongoing maintenance cost for no benefit.
- **Bifrost:** Less mature, smaller community, fewer provider integrations.

---

## ADR-004: pg_partman for Table Partitioning (over Manual Alembic)

**Status:** Accepted
**Date:** 2026-04-19
**Context:** Two tables grow unboundedly: `analytics_events` (10M+ rows/month at scale) and `submissions` (1M+/month). Both need monthly time-based range partitioning with automated retention policies.

**Decision:** Use **pg_partman** extension with **pg_cron** for automated maintenance.

**Rationale:**
- **Automated partition lifecycle:** pg_partman creates future partitions ahead of time and drops expired partitions per retention policy. No human or migration required.
- **No missing-partition risk:** Manual Alembic-based partitioning risks insert failures if a migration isn't run before the month rolls over. pg_partman eliminates this class of failure.
- **Retention policies:** Built-in `retention` and `retention_keep_table` options. Analytics events get 90-day retention (configurable per plan); submissions are permanent.
- **Production-proven:** pg_partman is the industry standard for PostgreSQL time-series partitioning.

**Implementation:**
- Initial Alembic migration creates the parent tables with `PARTITION BY RANGE (created_at)`.
- A second migration installs pg_partman and calls `create_parent()` to set up automated partitioning.
- pg_cron runs `run_maintenance()` every hour to create upcoming partitions and drop expired ones.
- Worker job also calls maintenance as a fallback in case pg_cron is unavailable.

**Alternatives rejected:**
- **Manual Alembic migrations:** High operational risk (forgotten migrations = insert failures), impractical for monthly partition creation in production.

---

## ADR-005: pnpm for Frontend Package Management

**Status:** Accepted
**Date:** 2026-04-19
**Context:** The PRD specifies pnpm. Confirming the decision.

**Decision:** Use **pnpm** (latest stable) for all frontend dependency management and monorepo workspace coordination.

**Rationale:** Faster installs, strict dependency resolution (no phantom deps), built-in workspace support for our monorepo, disk-efficient via content-addressable store.

---

## ADR-006: JSONB for Form Schemas

**Status:** Accepted
**Date:** 2026-04-19
**Context:** Each page can have a form with varying fields (text, email, phone, file, select, textarea). The field structure evolves per-page.

**Decision:** Store form schemas as JSONB in the `pages.form_schema` column, not as a normalized relational structure.

**Rationale:**
- Form schemas are small (typically 5-15 fields), read-heavy, write-infrequent.
- Each page's form is different — normalizing would require a `form_fields` join table with dynamic typing, which adds complexity without benefit.
- JSONB supports GIN indexing for queries (e.g., "find all pages with type file-upload field").
- The schema is validated by Pydantic on write, not by the database.
- Submission payloads reference the schema for validation but are also stored as JSONB.

---

## ADR-007: Resend for Transactional Email

**Status:** Accepted
**Date:** 2026-04-19
**Context:** PRD specifies Resend. Confirming with rationale.

**Decision:** Use **Resend** for all transactional email: submission notifications, confirmations, replies, team invitations.

**Rationale:** Simple Python SDK, webhook support for delivery tracking, React Email template compatibility (future), competitive pricing, excellent DX.
