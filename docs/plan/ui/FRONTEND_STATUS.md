# Frontend missions (FE-01–FE-07) — status snapshot

Short audit of `apps/web` against the seven frontend mission briefs. Percentages are judgment calls; update this file when a phase ships.

| Mission | Topic | ~Done | Notes |
|--------|--------|-------|--------|
| **FE-01** | Design system & tokens | **75%** | `tokens.css`, primitives, `lib/motion.ts`, fonts; Anthropic artifact not re-fetched every build |
| **FE-02** | Marketing | **60%** | Nav/footer, hero SSE demo, how-it-works motion, **pricing** table + FAQ (honest copy); gallery depth, SEO/JSON-LD, Playwright still open |
| **FE-03** | App shell, onboarding | **70%** | Sidebar, top bar, sheet mobile nav, command palette, onboarding; usage bar, billing in nav, `middleware` redirect nuances vary |
| **FE-04** | Studio | **65%** | Split chat/preview, SSE via `streamStudioSse`, refine, section edit hooks; polish (layout springs, publish confetti) partial |
| **FE-05** | Dashboard & pages | **50%** | Page list + detail tabs shell; submissions table, filters — backend-dependent |
| **FE-06** | Analytics & settings | **40%** | Settings stubs/brand/team; horizontal settings tabs not fully expanded |
| **FE-07** | Polish & motion | **40%** | Motion primitives; **global `app/not-found`**; full reduced-motion audit, axe on every route, custom **500** — incomplete |

**Non-negotiable from UI README:** no fake metrics; empty states first-class; micro-interactions on primary controls — ongoing discipline.

See also repo-wide [../IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md).
