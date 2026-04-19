# Mission 05 — Automations, Email & Calendar (report)

**Branch:** `mission-05-automations-integrations`  
**Date:** 2026-04-19

## Delivered

- **Resend + Jinja2**: `app/services/email/` with branded HTML + plaintext templates (notification, confirmation, reply, invitation, billing alert) and `EmailService` methods.
- **Automation engine**: `app/services/automations.py` runs after each submission (notify → confirm → calendar), records `AutomationRun` rows with `result_json`, updates `submissions.notification_message_id` for reply threading.
- **Google Calendar**: OAuth connect/callback with Redis state, encrypted tokens, `create_event_for_submission` in `app/services/calendar.py`.
- **API**: `GET/PUT /pages/{id}/automations`, `GET .../automations/runs`, `POST /calendar/connect/google`, `GET /calendar/callback/google`, `POST /calendar/connect/apple` (501), `GET/DELETE /calendar/connections`, `POST /webhooks/resend`, `POST /submissions/{id}/reply`.
- **Worker**: `run_automations` executes `AutomationEngine` with tenant RLS context.
- **Web**: Page-level automations UI with debounced save, recent runs, Google connect.
- **Docs**: `docs/runbooks/EMAIL.md`, `docs/runbooks/CALENDAR.md`.
- **DB**: migration adds `automation_runs.result_json`, `calendar_connections.last_error`, `submissions.notification_message_id`.

## Not in this pass (follow-up)

- Sticky failure banner, `/notifications` page, daily digest email, Resend inbound reply routing.
- Full idempotent job requeue with exponential backoff + DLQ admin (arq `Retry` wired per transient class).
- Apple Calendar beyond 501 stub.
- Lighthouse / Playwright E2E for full submission → email → calendar chain in CI.

## Verification

- `cd apps/api && uv run pytest tests/`
- `uv run ruff check app && uv run mypy app`
- `cd apps/web && pnpm exec tsc --noEmit && pnpm exec eslint . --max-warnings 0`
- Apply migration: `alembic upgrade head` in `apps/api`.
