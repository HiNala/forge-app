# Accessibility (Mission FE-07)

**Goal:** Zero `@axe-core/playwright` violations on every route, WCAG 2.1 AA.

## Automated checks

Marketing and design-system routes are covered by Playwright + axe in `apps/web/e2e/`. App routes need a **signed-in storage state** before a full sweep matches production.

```bash
cd apps/web
pnpm exec playwright test e2e/marketing-a11y.spec.ts
pnpm exec playwright test e2e/design-system-a11y.spec.ts
```

For the authenticated shell (`e2e/app-shell.spec.ts`), configure `storageState` per Playwright docs, then extend the suite to hit `/dashboard`, `/studio`, `/settings/*`, `/analytics`, etc.

## Manual checks (critical flows)

- VoiceOver (Safari) / NVDA (Windows): signup, create a page, submit a public form.
- Keyboard-only: Tab order, focus visibility, Escape on dialogs, **Skip to content** link.

## Fix policy

- Prefer **design tokens** for contrast fixes, not one-off hex values on components.
- Prefer **labels** and **`aria-live`** regions over `title` alone for dynamic status.
