# Forge — Planning Package

**Project:** Forge — AI-Powered Mini-App Builder
**Purpose:** This folder contains the complete planning package for building Forge, an AI-powered tool that turns a plain-English prompt into a finished, hosted, single-purpose web page (booking forms, contact forms, event RSVPs, daily menus, sales proposals, landing pages). It includes user case reports, a master Project Reference Document, and ten sequential missions for coding agents to execute.

---

## Reading Order

Read these documents in order. Each assumes the previous ones.

1. **[01_USER_CASE_REPORTS.md](./01_USER_CASE_REPORTS.md)** — Every user flow extracted from the design conversation. The "what the product does for people" layer. Start here to understand the product.

2. **[02_PRD.md](./02_PRD.md)** — The Project Reference Document. The full stack, the full architecture, every invariant, every environment variable, every scope boundary, the mission map. The bible. Every mission references this.

3. **[03_MISSION_00_DOCS_RESEARCH.md](./03_MISSION_00_DOCS_RESEARCH.md)** — Mission 00. The first mission the coding agent runs. Compiles all external documentation into `docs/external/`.

4. **[04_MISSION_01_CONTRACTS_SCAFFOLD.md](./04_MISSION_01_CONTRACTS_SCAFFOLD.md)** — Mission 01. Full database schema, every API endpoint, Pydantic schema strategy, and scaffolds both Next.js and FastAPI apps via their official initializers.

5. **[05_MISSION_02_FOUNDATION.md](./05_MISSION_02_FOUNDATION.md)** — Mission 02. Auth + multi-tenancy with Row-Level Security + brand kit.

6. **[06_MISSION_03_STUDIO_AI.md](./06_MISSION_03_STUDIO_AI.md)** — Mission 03. The Studio UI and the full AI orchestration layer (provider abstraction supporting OpenAI + Anthropic + Gemini, intent parser, component-library page composer, section editor, SSE streaming).

7. **[07_MISSION_04_LIVE_PAGES.md](./07_MISSION_04_LIVE_PAGES.md)** — Mission 04. Publishing pages to live URLs, public submission endpoint with file uploads, submissions admin, custom domains via Caddy.

8. **[08_MISSION_05_AUTOMATIONS.md](./08_MISSION_05_AUTOMATIONS.md)** — Mission 05. Resend email automation (notifications, confirmations, replies), Google Calendar OAuth and event creation, rule engine.

9. **[09_MISSION_06_ANALYTICS_BILLING_TEAMS.md](./09_MISSION_06_ANALYTICS_BILLING_TEAMS.md)** — Mission 06. Analytics ingestion and dashboards (page-type-specific), Stripe billing with webhooks and quota enforcement, team management polish.

10. **[10_MISSION_07_POLISH.md](./10_MISSION_07_POLISH.md)** — Mission 07. Full sweep for PRD compliance, designer integration, lint/type/test green, performance, accessibility (WCAG AA), security.

11. **[11_MISSION_08_RAILWAY_DEPLOY.md](./11_MISSION_08_RAILWAY_DEPLOY.md)** — Mission 08. Railway deployment, monitoring, alerting, custom domains, backups, runbooks, launch readiness.

12. **[12_MISSION_09_TEMPLATES.md](./12_MISSION_09_TEMPLATES.md)** — Mission 09. Curated template library (post-launch value-add feature).

---

## Execution Model

Run these missions sequentially. Each one ends with a functional application core — after Mission 04, Forge is usable; after Mission 05, it's valuable; after Mission 06, it's commercial; after Mission 08, it's live. Mission 09 is additive after launch.

Each mission:
- Lives on its own git branch (named `mission-XX-short-name`).
- Commits and pushes to GitHub meaningfully along the way, not just at the end.
- Instructs the coding agent to do everything needed for production readiness, even if that work overlaps with the PRD's scope boundary — the goal is always a shippable core at the end of the mission.
- Repeats "do not stop until every item is verified complete" three times at the bottom of the document because the agent will want to stop early and it must not.

---

## Stack At A Glance

- **Frontend:** Next.js 16 App Router · TypeScript · Tailwind CSS · Tanstack Query · Zustand · Zod · shadcn/ui · Framer Motion
- **Backend:** Python 3.12 · FastAPI · SQLAlchemy 2.0 async · Alembic · Pydantic v2 · uv · Ruff · pytest-asyncio · arq
- **Data:** PostgreSQL 16 with Row-Level Security + monthly time partitions · Redis 7 · MinIO (dev) / Cloudflare R2 (prod)
- **Integrations:** Resend · Google Calendar API · Stripe · Clerk or Auth.js (decided in Mission 00) · Sentry
- **AI:** Multi-provider abstraction (OpenAI default · Anthropic · Gemini via a unified adapter). Dual-tier model strategy: heavy for compose, fast for section edits.
- **DevOps:** Docker + Compose · Railway · GitHub Actions · Caddy reverse proxy for custom domains · pnpm workspaces monorepo

---

## Primary Persona

Lucy Martinez, office assistant at Reds Construction. Non-technical. Has a steady trickle of one-off page needs (small jobs form, holiday promo, wedding RSVP, daily menu, sales proposals). Wants to describe a page in English, get a branded page in under 5 minutes, and never think about it again except when submissions arrive in her inbox.

---

## Three Rules For Every Mission

1. Use the official app builders (`pnpm create next-app`, `uv init`), not hand-crafted files, for scaffolding.
2. Push to GitHub meaningfully throughout — commits should tell the story.
3. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.
