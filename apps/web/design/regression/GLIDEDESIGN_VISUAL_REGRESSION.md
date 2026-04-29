# GlideDesign Visual Regression

Baseline set: `glidedesign-baseline-v1`.

## Coverage

- Routes: `/`, `/pricing`, `/templates`, `/workflows`, `/compare`, `/definitely/missing/gd02`.
- Themes: `glidedesign-light`, `glidedesign-dark`.
- Breakpoints: desktop `1440x900`, tablet `834x1112`, mobile `390x844`.
- Additional artifacts: `logo-favicon-verification.png`, `home-og.png`.

## Capture Notes

Use isolated browser contexts per route/theme/breakpoint. This avoids cross-route redirects, stale local storage, and analytics/network noise from one route affecting another screenshot.

The latest GD-02 refresh captured all 30 public route/theme/breakpoint screenshots with `200` responses plus six true 404 screenshots from `/definitely/missing/gd02`.

## CI Guidance

For CI, run against a production-like app with seeded first-party auth users and stable external env. Prefer:

1. `pnpm --filter web build`
2. `pnpm --filter web start -- --hostname 127.0.0.1 --port 3000`
3. Playwright capture/compare using isolated contexts.

Acceptable threshold: route screenshots should only change when a PR intentionally touches visual identity, layout, copy, or route content. Store approved updates under `apps/web/design/regression/glidedesign-baseline-v1/`.
