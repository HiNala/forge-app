# Design Polish Pass — 2026-04-28

## Direction

This pass keeps Forge's existing warm, low-chrome language and makes it more intentional: cream surfaces, terracotta as the single accent, restrained hover lift, softer borders, quieter shadows, and more consistent focus/loading/empty states. The goal is polished and durable, not decorative.

## Completed 20-Item Checklist

1. Audited tokens, primitives, and visible product surfaces.
2. Preserved the existing warm cream / terracotta / restrained-radius direction.
3. Polished shared `Button` hover, shadow, and disabled feel.
4. Polished shared `Card` variants through reusable surface utilities.
5. Polished `Input` and `Textarea` hover, focus, and disabled states.
6. Polished `Skeleton` shimmer pacing and reduced-motion behavior.
7. Standardized `EmptyState` panel and icon treatment.
8. Polished the marketing hero with a quiet positioning eyebrow and divider.
9. Polished pricing cards, usage explainer cards, and comparison table surfaces.
10. Polished template gallery cards and preview modal chrome.
11. Polished dashboard header, page cards, first-run state, and error state.
12. Polished Studio shell chat/preview chrome and generation feedback.
13. Polished public/static preview iframe containers.
14. Polished settings integrations cards and status pills.
15. Polished usage/billing visual hierarchy.
16. Polished mobile and web canvas node chrome, menus, and selection panels.
17. Swept touched surfaces for hardcoded color and Tailwind class outliers.
18. Used existing lightweight lint coverage; no new unit tests were needed for class-only visual changes.
19. Ran targeted ESLint and IDE lint checks on edited web files.
20. Captured this design report for follow-up review.

## Surfaces Touched

- Shared primitives: `button`, `card`, `input`, `textarea`, `skeleton`, `empty-state`.
- Marketing: homepage, pricing page, gallery section, workflow metadata copy.
- App: dashboard, pages list, page detail preview, templates, settings integrations, settings usage.
- Studio/canvas: Studio shell, mobile canvas nodes, web canvas nodes.

## Verification

- Targeted ESLint passed for edited web files.
- IDE diagnostics are clean for edited polish surfaces.
- Forbidden copy sweep across `apps/web/src` found no `AI page builder` / `page builder` matches after this pass.

## Follow-Ups

- Visual regression screenshots should be regenerated once the app can be launched in a browser session.
- The remaining product-wide polish work should continue route-by-route in AL-04 with accessibility, Lighthouse, and real walkthrough evidence.
