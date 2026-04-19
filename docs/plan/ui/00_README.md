# Forge — Planning Package

**Project:** Forge — AI-Powered Mini-App Builder
**Purpose:** Complete planning package for building Forge, an AI-powered tool that turns a plain-English prompt into a finished, hosted, single-purpose web page (booking forms, contact forms, event RSVPs, daily menus, sales proposals, landing pages). Includes user case reports, a master Project Reference Document, ten backend missions, and seven frontend missions.

**Backend-focused index:** [../backend/00_README.md](../backend/00_README.md) (mission links for API/schema work)

**Frontend vs repo:** [FRONTEND_STATUS.md](./FRONTEND_STATUS.md)

---

## Local verification (apps/web)

From the repo root, after installing dependencies (`pnpm install`):

- `pnpm --filter web typecheck` — TypeScript
- `pnpm --filter web lint` — ESLint
- `pnpm --filter web test` — Vitest
- `pnpm --filter web build` — production build (optional)

---

## Reading Order

### Reference Documents (Read First)

1. **[01_USER_CASE_REPORTS.md](../01_USER_CASE_REPORTS.md)** — 11 user flows extracted from the design conversation. Lucy's persona, entity list, non-negotiable principles, mission sequencing. Start here.
2. **[02_PRD.md](../02_PRD.md)** — Master Project Reference Document. Stack, architecture, invariants, env vars, scope, mission map. The bible.

### Backend Missions (Missions 00–09)

Run sequentially. Each ends with a functional application core.

3. **[03_MISSION_00_DOCS_RESEARCH.md](../03_MISSION_00_DOCS_RESEARCH.md)** — Compile external documentation into `docs/external/`.
4. **[04_MISSION_01_CONTRACTS_SCAFFOLD.md](../04_MISSION_01_CONTRACTS_SCAFFOLD.md)** — Full schema, every endpoint, scaffold via official app builders.
5. **[05_MISSION_02_FOUNDATION.md](../05_MISSION_02_FOUNDATION.md)** — Auth + multi-tenancy (RLS) + brand kit.
6. **[06_MISSION_03_STUDIO_AI.md](../06_MISSION_03_STUDIO_AI.md)** — AI orchestration (OpenAI/Anthropic/Gemini) + SSE streaming.
7. **[07_MISSION_04_LIVE_PAGES.md](../07_MISSION_04_LIVE_PAGES.md)** — Publishing, submissions, file uploads, custom domains.
8. **[08_MISSION_05_AUTOMATIONS.md](../08_MISSION_05_AUTOMATIONS.md)** — Resend email + Google Calendar + automation rule engine.
9. **[09_MISSION_06_ANALYTICS_BILLING_TEAMS.md](../09_MISSION_06_ANALYTICS_BILLING_TEAMS.md)** — Analytics, Stripe billing, team management.
10. **[10_MISSION_07_POLISH.md](../10_MISSION_07_POLISH.md)** — Full PRD sweep, lint/type/test green, performance, a11y, security.
11. **[11_MISSION_08_RAILWAY_DEPLOY.md](../11_MISSION_08_RAILWAY_DEPLOY.md)** — Railway deployment + monitoring + runbooks + launch checklist.
12. **[12_MISSION_09_TEMPLATES.md](../12_MISSION_09_TEMPLATES.md)** — Curated template library (post-launch feature).

### Frontend Missions (Missions FE-01–FE-07)

Run in parallel with backend missions. FE-01 starts after Backend Mission 01. Each mission names its backend prerequisite.

13. **[13_MISSION_FE_01_DESIGN_SYSTEM.md](./13_MISSION_FE_01_DESIGN_SYSTEM.md)** — Fetches the designer's artifact from the Anthropic design URL, extracts tokens, builds every primitive component. Foundation for every surface.
14. **[14_MISSION_FE_02_MARKETING.md](./14_MISSION_FE_02_MARKETING.md)** — Landing with a live Studio demo in the hero, pricing, template gallery, FAQ, signup funnel with deep-link preservation.
15. **[15_MISSION_FE_03_APP_SHELL.md](./15_MISSION_FE_03_APP_SHELL.md)** — Sidebar with collapse persistence, top bar, workspace switcher, command palette, auth pages, onboarding wizard.
16. **[16_MISSION_FE_04_STUDIO.md](./16_MISSION_FE_04_STUDIO.md)** — The magic moment. Empty → split-screen active, SSE preview, section hover-click editing, refine chips, sidebar auto-collapse.
17. **[17_MISSION_FE_05_DASHBOARD_PAGES.md](./17_MISSION_FE_05_DASHBOARD_PAGES.md)** — Dashboard (grid, empty states, filters), Page Detail tabs (Overview, Submissions with expand-in-place, Automations, Analytics).
18. **[18_MISSION_FE_06_ANALYTICS_SETTINGS.md](./18_MISSION_FE_06_ANALYTICS_SETTINGS.md)** — Page-type-adaptive analytics, Settings as a single horizontal tab strip (Profile, Workspace, Brand, Team, Billing, Integrations, Notifications).
19. **[19_MISSION_FE_07_POLISH_MOTION.md](./19_MISSION_FE_07_POLISH_MOTION.md)** — Motion coherence, micro-interactions, keyboard flows, WCAG AA, Lighthouse targets, copy audit, empty/error state audit, cross-browser.

---

## Execution Mapping

| Frontend Mission | Backend Prerequisite |
|---|---|
| FE-01 Design System | BE-01 scaffold |
| FE-02 Marketing | BE-01 scaffold |
| FE-03 App Shell + Auth + Onboarding | BE-02 auth + orgs |
| FE-04 Studio | BE-03 AI + SSE |
| FE-05 Dashboard + Page Detail | BE-04, BE-05 |
| FE-06 Analytics + Settings | BE-06 analytics/billing/teams |
| FE-07 Polish | All prior FE complete |

---

## Stack At A Glance

- **Frontend:** Next.js 16 App Router · TypeScript · Tailwind CSS · Tanstack Query · Zustand · Zod · shadcn/ui · Framer Motion · `@microsoft/fetch-event-source`
- **Backend:** Python 3.12 · FastAPI · SQLAlchemy 2.0 async · Alembic · Pydantic v2 · uv · Ruff · arq
- **Data:** PostgreSQL 16 with Row-Level Security + monthly time partitions · Redis 7 · MinIO (dev) / Cloudflare R2 (prod)
- **Integrations:** Resend · Google Calendar · Stripe · Clerk or Auth.js · Sentry
- **AI:** Multi-provider (OpenAI default · Anthropic · Gemini) via unified adapter; dual-tier (heavy compose / fast section-edits)
- **DevOps:** Docker Compose · Railway · GitHub Actions · Caddy reverse proxy · pnpm workspaces monorepo

---

## Design Direction (Locked by FE-01)

- Warm cream background `#f9f7f3`
- Teal accent `oklch(50% 0.15 192)`
- Display: Cormorant Garamond (400/600/700)
- Body: Manrope (300/400/500/600)
- Dark Studio panel `#0d0c0b` (local dark scope only)
- Standard easing `cubic-bezier(.4,0,.2,1)`; spring for success

The canonical values come from the designer's artifact fetched in FE-01.

---

## Three Non-Negotiable Invariants

1. **No redundant chrome.** Single primary navigation per surface. Settings uses horizontal tabs. Studio input IS Studio — no header explaining it.
2. **No fake metrics.** Every number comes from a real API. Empty states are first-class.
3. **Every interaction has a micro-response.** Button press, card hover, input focus, transition, success — nothing static.

---

## The Mixture of Experts

Each mission invokes legendary designers as review lenses:

- **Raskin / Tesler / Norman** — interaction clarity, mode-free flows
- **Jobs / Ive / Rams** — subtraction, emotional weight
- **Atkinson / Kare** — delight, warmth, visual clarity
- **Systrom / Fadell** — friction removal, ecosystem thinking
- **Nielsen / Garrett** — usability measurement, structural coherence
- **Kay / Engelbart** — "is this a new medium?" gut-check

---

## Three Rules For Every Mission

1. Read the PRD and User Case Reports before writing a line.
2. Commit and push to GitHub meaningfully throughout.
3. **Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**
