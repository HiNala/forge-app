# Forge — Planning Package

**Project:** Forge — AI-Powered Mini-App Builder  

**Purpose:** Complete planning package for building Forge — an AI-powered tool that turns a plain-English prompt into a finished, hosted, single-purpose web page (booking forms, contact forms, event RSVPs, daily menus, sales proposals, landing pages). It includes user case reports, a master Project Reference Document, ten backend missions, and seven frontend missions.

---

## Start here

| Read first | Link |
|------------|------|
| **Full index** (reference docs, missions **00–09** and **FE-01–FE-07**, execution mapping, stack, design direction, invariants, mixture of experts, mission rules) | **[ui/00_README.md](./ui/00_README.md)** |
| User flows & persona | [01_USER_CASE_REPORTS.md](./01_USER_CASE_REPORTS.md) |
| PRD — stack, architecture, invariants, env, scope | [02_PRD.md](./02_PRD.md) |
| Repo vs plan | [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) — *executive summary* + *By mission document* |
| Backend-only detail | [backend/00_README.md](./backend/00_README.md) |
| Frontend vs codebase | [ui/FRONTEND_STATUS.md](./ui/FRONTEND_STATUS.md) |
| Backend mission reports (sparse) | [MISSION_06_REPORT.md](./MISSION_06_REPORT.md) · [MISSION_07_REPORT.md](./MISSION_07_REPORT.md) |
| Frontend mission reports | [ui/00_README.md](./ui/00_README.md) — *Mission reports* table (FE-02 … FE-07) |

The **canonical planning narrative** that matches the Planning Package outline (numbered reading order through **19**, FE ↔ BE prerequisites, three non-negotiable invariants, etc.) is **[ui/00_README.md](./ui/00_README.md)**. Use that file when onboarding an agent or teammate.

Each backend mission file **`03_*` … `12_*`** now ends with a **Repo tracking (living)** section pointing back to **IMPLEMENTATION_STATUS** (and linked reports where relevant).

---

## Backend mission documents (00–09)

Run **sequentially**. Each ends with a functional application core. Mission files live in this folder:

1. [03_MISSION_00_DOCS_RESEARCH.md](./03_MISSION_00_DOCS_RESEARCH.md) — `docs/external/` compilation  
2. [04_MISSION_01_CONTRACTS_SCAFFOLD.md](./04_MISSION_01_CONTRACTS_SCAFFOLD.md) — schema, endpoints, scaffolds  
3. [05_MISSION_02_FOUNDATION.md](./05_MISSION_02_FOUNDATION.md) — auth, RLS, brand  
4. [06_MISSION_03_STUDIO_AI.md](./06_MISSION_03_STUDIO_AI.md) — AI orchestration, SSE  
5. [07_MISSION_04_LIVE_PAGES.md](./07_MISSION_04_LIVE_PAGES.md) — publish, submissions, domains  
6. [08_MISSION_05_AUTOMATIONS.md](./08_MISSION_05_AUTOMATIONS.md) — Resend, Calendar, rules  
7. [09_MISSION_06_ANALYTICS_BILLING_TEAMS.md](./09_MISSION_06_ANALYTICS_BILLING_TEAMS.md) — analytics, Stripe, teams  
8. [10_MISSION_07_POLISH.md](./10_MISSION_07_POLISH.md) — PRD sweep, quality bar  
9. [11_MISSION_08_RAILWAY_DEPLOY.md](./11_MISSION_08_RAILWAY_DEPLOY.md) — Railway, runbooks  
10. [12_MISSION_09_TEMPLATES.md](./12_MISSION_09_TEMPLATES.md) — template library (post-launch)  

Frontend missions **FE-01–FE-07** (files `13_*`–`19_*` under `docs/plan/ui/`) are listed in **[ui/00_README.md](./ui/00_README.md)**.

---

## Execution model (backend)

After Mission 04, Forge is usable; after 05, valuable; after 06, commercial; after 08, deployable. Mission 09 is additive. Missions use dedicated branches; commits should tell the story; each mission doc repeats **do not stop until every TODO is verified** so execution doesn’t trail off early.

---

## Primary persona

Lucy Martinez — office assistant at Reds Construction, non-technical, steady trickle of one-off pages. She wants to describe a page in English, get something branded in minutes, and only come back when submissions hit her inbox.

---

## Rules (summary)

Detailed rules appear in **[ui/00_README.md § Three Rules](./ui/00_README.md#three-rules-for-every-mission)** (read PRD + user cases first; ship meaningful commits; verify every mission TODO). Where a mission says to use official scaffolds (`pnpm create next-app`, `uv init`), follow that — it implements the same intent as “official app builders” in older briefs.
