# Visual regression — baselines (BP-05)

Captured **canonical screenshots** belong here (`light/` + `dark/`, breakpoints `desktop` / `tablet` / `mobile`).

## Workflow

1. After deliberate visual freezes, regenerate baselines locally (Playwright / Chromium scripted capture of major routes).

2. Name files:
   `{route-segment}-{theme}-{breakpoint}.png`  
   Example: `pricing-light-desktop.png`.

3. On PR CI, optionally wire Playwright/`pixelmatch` / Percy-equivalent tooling — **`>2%` diff thresholds require DESIGN approval** — **not enforced in-repo automatically at BP-05 commit** pending CI capacity.

### Last baseline refresh

Update this subsection when snapshots rotate:

| Date | Rationale | Owner |
|------|-----------|-------|
| TBD — initial capture pending Playwright stabilization | Establish baseline after Forge workshop palette settles | DESIGN |
