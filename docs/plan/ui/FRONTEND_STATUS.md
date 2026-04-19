# Frontend missions (FE-01–FE-07) — status snapshot

Short audit of `apps/web` against the seven frontend mission briefs. Percentages are judgment calls; update this file when a phase ships.

**Last audited:** 2026-04-19 — Typescript build + Vitest green; aligns with `MISSION-FE-0x-REPORT.md` where present.

| Mission | Topic | ~Done | Notes |
|--------|--------|-------|--------|
| **FE-01** | Design system & tokens | **82%** | `styles/tokens.css`, primitives under `components/ui/`, `lib/motion.ts`, Cormorant + Manrope; design URL is **manual upstream** (not fetched on every CI run) |
| **FE-02** | Marketing | **76%** | Nav/footer, hero demo via `streamPublicDemo` → `POST /api/v1/public/demo`, gallery, FAQ, pricing + OG; Playwright `e2e/marketing-*.spec.ts` |
| **FE-03** | App shell, onboarding | **78%** | Sidebar + collapse, top bar, mobile sheet nav, **command palette** (⌘K; expanded in FE-07 with pages/team/recents), onboarding gate, Clerk flows |
| **FE-04** | Studio | **72%** | Split chat/preview, SSE generate/refine, section edit, publish dialog, first-publish toast + confetti (FE-07); iframe preview + quota UX still improvable |
| **FE-05** | Dashboard & pages | **70%** | Dashboard grid + URL filters, page detail tabs, submissions table (expand, bulk, CSV, reply), automations UI — edge cases + E2E coverage remain |
| **FE-06** | Analytics & settings | **78%** | Page + org analytics (real data, Recharts + table toggles), horizontal settings tabs, brand/team/billing/integrations/notifications — see [MISSION-FE-06-REPORT.md](../MISSION-FE-06-REPORT.md); Stripe/invite **E2E** and axe on **all** app routes deferred |
| **FE-07** | Polish & motion | **58%** | Skip link, offline banner, error boundaries, reduced-motion route variant, lazy analytics chunks, button/card motion, confetti; [MISSION-FE-07-REPORT.md](../MISSION-FE-07-REPORT.md); Lighthouse **per-route**, authenticated axe sweep, `500` page w/ Sentry ID — not finished |

**Non-negotiable from [00_README.md](./00_README.md):** no fake metrics; empty states first-class; micro-interactions on primary controls — ongoing discipline.

**Mission reports (shipped scope + follow-ups):** [FE-02](../MISSION-FE-02-REPORT.md) · [FE-03](../MISSION-FE-03-REPORT.md) · [FE-04](../MISSION-FE-04-REPORT.md) · [FE-05](../MISSION-FE-05-REPORT.md) · [FE-06](../MISSION-FE-06-REPORT.md) · [FE-07](../MISSION-FE-07-REPORT.md) · *(FE-01 marketing/design handoff can add `MISSION-FE-01-REPORT.md` if useful)*

See also repo-wide [../IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md) and plan hub [../00_README.md](../00_README.md).
