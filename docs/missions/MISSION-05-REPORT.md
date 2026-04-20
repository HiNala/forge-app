# Mission 05 — Automations, Email & Calendar (report)

## Delivered

- **Email:** Resend integration with Jinja2 HTML + text templates under `app/services/email/templates/`; structured `EmailService` methods; transient failures raise `TransientAutomationError` for worker retry.
- **Worker:** `run_automations` uses Redis for idempotent per-email / confirm / calendar keys; on transient errors raises arq `Retry` with exponential-style defer (5s → 600s); `max_tries=5`, `job_timeout=300`; enqueue uses `_job_id=forge:auto:sub:{submission_id}`.
- **Engine:** `AutomationEngine` commits per step; skips completed steps via `AutomationRun`; Redis prevents duplicate sends after partial failures.
- **Calendar:** Google OAuth flow, token encryption, event creation with booking/preferred date handling, `TransientAutomationError` on Google 5xx/429; **DELETE** connection revokes Google token before delete.
- **API:** `GET /api/v1/automations/failure-summary`, `GET /api/v1/automations/failures` (with `page_id`); existing page automation CRUD and retry endpoint.
- **Web:** Dashboard banner when `failed_last_24h > 0`; `/notifications` lists recent failures with links to page automations.
- **Docs:** `docs/runbooks/EMAIL.md`, `docs/runbooks/CALENDAR.md`; `WORKER.md` updated for timeouts/retries.

## Follow-ups

- Resend webhook → in-app `Notification` rows for bounces (requires mapping message to org).
- Daily owner digest email when failures persist 24h+ (preference exists in settings UI).
- Deeper E2E tests with mocked Resend/Google.
