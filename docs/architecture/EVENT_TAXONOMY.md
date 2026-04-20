# Event taxonomy (GL-01)

The authoritative catalog lives in `apps/api/app/services/analytics/events.py` as `EVENTS: dict[str, EventDefinition]`. PostgreSQL enforces allowed **system** names via `ck_analytics_events_event_type` on `analytics_events`; names matching `^custom\.[a-z0-9][a-z0-9_.-]*$` are allowed for org-defined custom events registered in `custom_event_definitions`.

## Surfaces

| Surface | Cookie / identity | Endpoint |
|--------|-------------------|----------|
| Published pages | `forge_v`, `forge_s` (see `apps/web/public/forge-track.js`) | `POST /p/{org}/{page}/track` |
| Web app (Studio / Dashboard) | Session + auth | `POST /api/v1/analytics/track` |

The API validates each event’s `metadata` against `required_properties` for that type. Unknown types are rejected with 400.

## Legacy renames (migration `g101_gl01_engagement_analytics`)

| Before | After |
|--------|--------|
| `form_submit` | `form_submit_success` |
| `proposal_accept` | `proposal_accept_click` |
| `present_started` | `present_start` |
| `present_slide_viewed` | `present_slide_view` |
| `present_ended` | `present_end` |

## Example payloads

- **`dashboard_view`** (Studio / app shell) — `{ "route": "/dashboard", "surface": "web_app" }` (no `page_id` required). Emitted by `useAnalytics` on route change.
- **`page_view`** — `{ "page_id": "<uuid>" }` (server injects on public track if omitted).
- **`form_submit_success`** — `{ "page_id": "<uuid>", "submission_id": "<uuid>" }` from server on successful submit.
- **`identity_merge`** — `{ "visitor_id": "...", "user_id": "<uuid>", "reason": "signup" }` for stitching.

Refer to `EventDefinition.description` in code for each type.
