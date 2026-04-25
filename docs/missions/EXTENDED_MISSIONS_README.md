# Forge — Extended Mission Set

Four parallel/sequential mission tracks that build Forge's core machinery, plus a final smoke-test mission and a go-live set that deploys the thing.

- **`backend-infra/`** — Database schema + multi-tenancy + middleware + API contracts + full settings surface. 4 missions (BI-01 through BI-04).
- **`workflows/`** — The three flagship product workflows and their integration into the app. 4 missions (W-01 through W-04).
- **`orchestration/`** — Provider abstraction + context gathering + intent/planning + composer agents + mixture-of-experts review. 4 missions (O-01 through O-04).
- **[FINAL_SMOKE_TEST_POLISH.md](./FINAL_SMOKE_TEST_POLISH.md)** — The human-walkthrough mission. Boot everything, use every surface as a real user would, fix everything that's not perfect.
- **`go-live/`** — Analytics + admin dashboard + integration testing + Railway deployment. 4 missions (GL-01 through GL-04). The last step before Forge is operational in production.

---

## Recommended Execution Order

The tracks have some parallelism but also critical dependencies:

```
BI-01 (DB + Multi-tenancy)
  ↓
BI-02 (Middleware + Routing)
  ↓
BI-03 (API Contracts + Services + Worker)
  ↓                         ↓
BI-04 (Settings)            O-01 (Provider + Context)
                              ↓
                            O-02 (Intent + Planning + Graph)
                              ↓
                            O-03 (Composer Agents)
                              ↓
                            O-04 (Review Panel)
                              ↓
                            W-01 (Contact + Calendar)
                              ↓
                            W-02 (Proposal)
                              ↓
                            W-03 (Pitch Deck)
                              ↓
                            W-04 (Workflow Integration)
                              ↓
                            FINAL_SMOKE_TEST_POLISH
                              ↓
                            GL-01 (Engagement Analytics)
                              ↓
                            GL-02 (Admin Dashboard + Platform RBAC)
                              ↓
                            GL-03 (Integration Testing)
                              ↓
                            GL-04 (Railway Deployment — live!)
```

Frontend missions (from the other `forge-missions/` folder, files 13-19) run in parallel:
- F01 (Design system) can start after BI-01 scaffolds.
- F02-F06 depend on the relevant backend endpoints being live.
- F07 (polish) runs just before the FINAL_SMOKE_TEST_POLISH mission.

---

## How Each Track Fits

### Backend-Infra (BI)
The machine underneath. Every table, every endpoint, every middleware, every background job, every setting. No product features on their own — this is the load-bearing foundation that the workflows and orchestration stand on.

**BI-01** — PostgreSQL schema, Row-Level Security, monthly partitioning, Alembic discipline, per-role DB users.
**BI-02** — Request pipeline: request-id, logging, CORS, body-size limits, rate limiting, auth, tenant resolution, DB session with `SET LOCAL` session vars, structured errors.
**BI-03** — 60+ endpoints across 14 routers, the arq worker, Stripe webhooks, ICS calendar parsing and availability computation, public page serving with JS-disabled fallback.
**BI-04** — User preferences, org settings, custom domains, API tokens with scopes, outbound webhooks, data export + org delete, email template overrides, notifications center, admin surface with impersonation, audit log.

### Workflows (W)
The three flagship product experiences, plus their unified integration into Forge's surface.

**W-01** — Contact form with ICS calendar import, availability computation, slot holds (with GiST exclusion constraint for double-booking prevention), booking with ICS attachments and Google Calendar event creation, cancel/reschedule magic links.
**W-02** — Contractor proposal builder with every mandatory section (cover, scope, exclusions, line items, timeline, terms), three acceptance methods (click / typed / drawn signature), signed-PDF generation, change orders, inline client questions, legal guardrails.
**W-03** — Pitch deck workflow with narrative frameworks (Sequoia, YC, etc.), two-stage composition (outline → parallel expand), per-slide layouts, chart generation, image generation with progressive render, presenter mode with keyboard nav, PPTX / PDF / Google Slides export, per-slide analytics.
**W-04** — All three workflows woven into a coherent product: Studio workflow picker, workflow-aware Page Detail, marketing landing pages per workflow, cross-workflow conversions (submission → proposal), unified digest emails, command palette shortcuts.

### Orchestration (O)
The AI brain. This is where the user's brief about "mixture of experts", "give output before asking questions", "URL + brand → designed page right away" lives.

**O-01** — Provider-agnostic LLM adapter (OpenAI / Anthropic / Gemini) with streaming + structured outputs + fallback chain + cost tracking. Context-gathering pipeline: URL extraction, site brand extraction, site voice inference, user voice history, calendar context. All parallel, time-bounded, never blocks.
**O-02** — Intent parser (structured output to `PageIntent`), deterministic per-workflow planner, directed-graph orchestration engine (our own 300-line LangGraph-style runtime), generate / section-edit / refine graphs, SSE event schema, cost budgeting per plan tier.
**O-03** — The composer agents with rich system prompts written in the voice of Jobs, Rams, Atkinson, Kare, Nielsen, Norman, Tufte. Component library (40+ named components) that composers reference — separates LLM's content job from deterministic rendering job. Per-workflow specialized composers (contact, proposal, deck, landing, menu, RSVP, gallery, promotion).
**O-04** — Mixture-of-experts review as a single structured LLM call (not seven separate calls — smart architecture for cost and latency). Findings attributed to the right expert, with auto-fixable flags and severity. Refine loop with max 2 iterations. Voice drift detection, brand drift detection, accessibility checks, workflow-specific checks.

### Go-Live (GL)
The machinery that lets Forge live in production — analytics at full granularity, the control plane for running it as a business, exhaustive integration testing, deployment to Railway.

**GL-01** — Engagement analytics: 80+ event taxonomy, public + in-app client trackers with queue+batch ingestion, session stitching + identity merge (pre-signup events attributed to the signed-up user), funnel engine with field-level drop-off, retention cohorts, custom events per org, segmentation engine, raw + aggregated + BI-connector data exports. Feature flags + A/B experiments stamped on every event.
**GL-02** — Admin dashboard with platform-level RBAC (Super Admin, Admin, Support, Analyst, Billing) decoupled from per-org roles. Traffic / signups / MRR / LLM cost / system health surfaces. LLM observability breaks down cost by provider / model / role / workflow / org / user / page. Impersonation with reason capture and audit trail. Pulse view answers "how's Forge doing" in 30 seconds.
**GL-03** — Integration testing: Playwright E2E across every user journey, k6 load suites with documented thresholds, OWASP security probes (SQLi, XSS, CSRF, IDOR, path traversal, auth bypass), webhook replay tests, calendar DST and recurrence edge cases, LLM provider chaos with fallback verification, exhaustive RLS audit across every tenant-scoped table, automated accessibility suite, visual regression. Identifies the "go-live green" build.
**GL-04** — Railway deployment via CLI, end-to-end. Agent drives every step: project + environments + services (caddy, web, api, worker) + Postgres/Redis plugins + env vars + migrations + DNS + on-demand TLS + Stripe webhook registration + CI/CD (auto-staging, gated production) + monitoring + alerting + backups + disaster recovery runbooks + rollback rehearsal. Result: `forge.app` is live.

---

## The User's Ask, Addressed Directly

From the original brief:

> **"Take the users vague requirements and convert them into actionable tasks for the coding agent to build the pages with no additional information."**
> → O-02's intent parser produces a typed `PageIntent`. Assumptions are tracked explicitly. O-03's planners produce a complete `PagePlan` deterministically. Composers execute against the plan.

> **"User goes from 'I want a contact page for my business [website here] in my brand styles' and we can start the build right away."**
> → O-01's context gathering extracts brand from the URL in parallel with the first LLM call. By the time the composer starts, it knows the brand colors, fonts, tone, and services.

> **"Even if we have more questions we should give the user action and output in the form of a designed page before asking for more information or iterations."**
> → The clarify flow from O-02 is always non-blocking. When confidence is low, we emit a `clarify` event that the frontend renders as an in-chat switch AND we proceed with the top candidate. User can correct or continue.

> **"We should have expert designer and everything system prompts in place for the orchestration layer."**
> → O-03 specifies every composer's system prompt as a ~3000-token expert-voice document with annotated exemplars. Prompts are versioned and evaluated with a CI harness.

> **"The best coding agent we can create within the scope of this app."**
> → O-04's mixture-of-experts review panel + self-healing refine loop means every page goes through critique and correction before reaching the user. Quality scores are tracked per run.

---

## Final Notes

Every mission follows the same shape established in earlier folders:
- Branch name.
- Prerequisites.
- Experts consulted.
- How to run (the discipline specific to this mission).
- TODO list organized by phases.
- Acceptance criteria.
- Triple-repeated "do not stop until every item is verified complete" at the bottom.

Every mission commits to GitHub meaningfully throughout, not just at the end. Every mission's TODO items are specific enough that a coding agent can execute them without additional clarification.

The final mission is the one where we verify it all actually works as a product, not as a collection of features. That's where Forge goes from "built" to "shipped."
