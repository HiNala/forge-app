# Load-test baselines (GL-03)

Update this file when k6 scenarios are run against a **stable staging** build with realistic data.

| Scenario | p50 | p95 | p99 | Error rate | Date | Commit |
|----------|-----|-----|-----|------------|------|--------|
| `public_form_submit.js` | — | — | — | — | — | — |
| `analytics_burst.js` | — | — | — | — | — | — |

Thresholds in each `load/scenarios/*.js` file are the source of truth for regression automation once nightly runs are wired.
