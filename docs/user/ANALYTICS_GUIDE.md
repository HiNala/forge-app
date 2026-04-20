# Analytics in Forge

## What we measure

Forge records structured events for published pages (views, scroll, forms, decks, proposals) and for the Studio/Dashboard (navigation, publish actions, errors). Events are tied to your organization; public visitors are identified by a first-party cookie (`forge_v`) and session (`forge_s`).

## Funnels

Use **Contact form** default funnel API (`/api/v1/analytics/funnels/default/contact-form/compute`) to see step counts for: page view → form view → form start → submit attempt → submit success. Field-level issues surface via `form_field_abandon` events.

## Retention

Weekly signup cohorts and returns are available via **Retention** (`/api/v1/analytics/retention`) after the nightly materialized view refresh.

## Privacy

Account deletion triggers PII scrub on analytics rows after the grace period (see BI-04 runbooks). You can export raw events via the export API when enabled for your plan.
