# Mission W-01 — Contact form with calendar availability (report)

**Branch:** `mission-w01-contact-calendar`  
**Date:** 2026-04-19

## Summary

The workflow is **implemented end-to-end** in code: calendar configuration UI (`apps/web/.../settings/calendars/page.tsx`), ICS parsing with `recurring-ical-events` and caps (`parse_ics.py`), server-side slot computation (`booking_calendar/availability.py`), Redis caching (`booking_calendar/cache.py`), public routes under `/p/{org_slug}/{page_slug}/` for availability, holds, and submissions (`public_api.py`), `slot_holds` with PostgreSQL `EXCLUDE` overlap prevention, worker jobs (`ics_calendar_sync`, `expire_pending_holds`), and docs (`docs/workflows/CONTACT_WITH_BOOKING.md`, `docs/runbooks/CALENDAR_DEBUGGING.md`).

This report records **verification** and **tests added** in the mission pass; several mission checklist items remain **product polish** (demo video, full branded email parity, cancel/reschedule magic-link pages).

## Verified in codebase

| Area | Location / notes |
|------|------------------|
| Settings → Calendars | Tab in `settings/layout.tsx`; page with ICS upload/preview, debounced PATCH, suggested business hours |
| ICS pipeline | `parse_ics.py`: RRULE expansion, transparency/status skips, all-day handling, `MAX_EXPANSIONS`, sync summary shape |
| Availability algorithm | `compute_slots`: business hours per weekday, buffers, min/max window, busy-block overlap |
| Public API | `GET .../availability`, `POST/DELETE .../availability/hold`, `POST .../submit` with `hold_id` + fingerprint |
| Intent / page config | `resolve_calendar_for_page` reads `intent_json.booking` and `form_schema.forge_booking` |
| Worker | `expire_pending_holds`, `ics_calendar_sync` (URL fetch + ETag path in sync module) |
| Double-booking | `slot_holds_no_overlap` + `btree_gist` (see migration `w01_contact_calendar_availability`) |

## Tests added (this mission pass)

- `tests/test_w01_availability_integration.py` (Postgres): empty calendar slot count, buffer + busy reduces slots, **second identical hold → HTTP 409**.
- `tests/test_w01_parse_ics.py`: **weekly RRULE ×12**, **EXDATE** exclusion count.

Existing: `test_w01_parse_ics.py` (minimal ICS, transparent/cancelled, expansion cap).

## Outstanding vs mission checklist (non-blocking for “works”)

- **§51 Demo video** — not recorded in-repo.
- **§29–31 Email** — branded flows depend on `AutomationEngine` / Resend; confirm ICS attachment on every path in staging.
- **§31 Cancel/reschedule** — `booking_token` on submission exists; dedicated public routes/UI may need wiring if not already in `public_runtime` / web app.
- **§33–35 Page detail / dashboard widgets** — frontend F-05/F-06 scope; verify against current `apps/web` submissions UI.
- **§45–48** — full E2E with mocked Google API, DST-only test, a11y audit — extend as follow-up.
- **CI DB** — local full `pytest` may fail if DB schema lags migrations (e.g. `analytics_events.user_id`); run `alembic upgrade head` on the test database.

## Acceptance mapping

- Import ICS + rules + preview: **yes** (API + settings page).
- Studio slot picker + live availability: **backend + intent** yes; confirm generated HTML includes slot picker component in your O-03 build.
- Submissions + holds: **yes**.
- DB-level double-book prevention: **yes** (EXCLUDE + integration test for 409).
- Docs: **CONTACT_WITH_BOOKING.md**, **CALENDAR_DEBUGGING.md**; workflow doc suitable for users; screenshots optional.
