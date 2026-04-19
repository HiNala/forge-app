# MISSION 05 — Automations, Email & Calendar Integrations

**Goal:** Close the loop between submission and business outcome. When a form is submitted, Forge notifies the owner, sends a branded confirmation to the submitter, and (if configured) creates a calendar event with an invite — all automatically, idempotently, with full retry and failure visibility. This mission turns Forge from "a tool that collects data" into "a tool that runs your small-business intake process."

**Branch:** `mission-05-automations-integrations`
**Prerequisites:** Mission 04 complete. Submissions arrive. Worker queue is live.
**Estimated scope:** Medium. Three integrations wired up, plus the rule engine that coordinates them.

---

## How To Run This Mission

Read User Case Reports Flow 6 before starting. The emotional core of this mission is: **Lucy configures this once and never has to think about it again.** Every automation that fires must be idempotent, retry correctly on failure, and surface failures loudly without blocking the submission itself.

Commit on milestones: Resend service wired, notification emails firing, confirmation emails firing, Google OAuth working, calendar event creation working, automation rule UI complete, observability dashboard showing runs.

**Do not stop until every item is verified complete. Do not stop until every item is verified complete. Do not stop until every item is verified complete.**

---

## TODO List

### Phase 1 — Resend Email Service

1. Set up Resend account in the ops runbook. Verify the `forge.app` domain via DNS records (documented in `docs/runbooks/EMAIL.md`).
2. Implement `app/services/email.py` as a clean service class with methods: `send_notification()`, `send_confirmation()`, `send_reply()`, `send_invitation()`, `send_billing_alert()`. Each takes structured args, not raw HTML.
3. Use React Email for templating. Create `apps/api/app/services/email/templates/` with Jinja2 templates that match common transactional email patterns. For MVP these are plain Jinja; we can migrate to React Email (rendered via a Node-side process or Resend's React Email integration) in a future polish pass.
4. Every template takes brand kit tokens (primary color, logo_url, voice_note) and renders a branded header + body.
5. Template list:
    - `notification.html.j2` — "New submission on {page_title}"
    - `confirmation.html.j2` — "Thanks for your submission"
    - `reply.html.j2` — custom subject/body with branded wrapper
    - `invitation.html.j2` — "You've been invited to {org_name}"
    - `billing_failed.html.j2` — "We couldn't process your payment"
6. Every email includes a plaintext fallback.
7. Every send-email call records the Resend message ID back to the relevant DB row (SubmissionReply, AutomationRun, Invitation).
8. Set up Resend webhook handler at `POST /api/v1/webhooks/resend` — verify signature, update delivery status (delivered, bounced, complained). Failed deliveries surface in the Admin → Notifications view.
9. Test sending with Resend's sandbox mode in dev; use real sends in staging and production.

### Phase 2 — Automation Rule Engine

10. Implement the `AutomationEngine` service in `app/services/automations.py`. The single public method is `run_for_submission(submission_id)`. It:
    - Loads the submission, the page, the automation rule.
    - Executes each step in order, recording an AutomationRun per step.
    - Returns a summary.
11. Steps implemented:
    - `notify` — emails each address in `notify_emails` using the notification template.
    - `confirm` — emails `submitter_email` using the confirmation template.
    - `calendar_event` — if `calendar_sync_enabled`, create an event on the connected calendar.
    - `calendar_invite` — if `calendar_send_invite`, add the submitter as an attendee.
12. Each step is wrapped in try/except. A failure marks the AutomationRun as failed, logs the error, but does NOT fail the whole pipeline. The other steps still run.
13. Idempotency: `run_for_submission` checks if a successful AutomationRun already exists for each step and skips if so. The enqueue key is `auto:sub:{submission_id}`.
14. Retries: on transient failure (5xx from Resend, 5xx from Google), the job requeues with exponential backoff (5s, 30s, 2m, 10m). After 4 failures, mark permanent failure and alert the org via a sticky notification banner.
15. Implement `GET /api/v1/pages/{page_id}/automations/runs` — returns recent AutomationRun rows with status and error messages. Powers the observability UI.

### Phase 3 — Automation Configuration UI

16. Build `(app)/pages/[pageId]/automations/page.tsx` per User Case Flow 6. Three sections:
    - **Notify on submission** — toggle + chip-list of emails with an add-email input.
    - **Send confirmation to submitter** — toggle + editable subject/body with a live preview pane showing what the email will look like with the brand kit applied.
    - **Calendar sync** — conditional section, shows "Connect Google Calendar" if not connected; once connected shows the configuration sub-options (duration, invite toggle).
17. Every toggle and text change auto-saves (debounced 500ms). No "Save" button — this is the Apple-esque "change propagates immediately" pattern.
18. Show a small "recent runs" section at the bottom with the last 10 automation runs, with their status dots, timestamps, and click-to-expand error details for failures.

### Phase 4 — Google Calendar OAuth

19. Set up OAuth credentials in the Google Cloud Console for the Forge application. Use the **web application** flow, not desktop. Redirect URI: `https://api.forge.app/api/v1/calendar/callback/google` (prod) and `http://localhost:8000/api/v1/calendar/callback/google` (dev).
20. Implement `POST /api/v1/calendar/connect/google`. Generates a random state token, stores it in Redis with the user_id + org_id (5-min TTL), redirects to Google's consent URL with scopes `https://www.googleapis.com/auth/calendar.events`.
21. Implement `GET /api/v1/calendar/callback/google`. Validates state, exchanges the code for tokens, encrypts tokens with AES-GCM using SECRET_KEY, stores in `calendar_connections`. Redirects back to `(app)/pages/{page_id}/automations?connected=true`.
22. Implement `DELETE /api/v1/calendar/connections/{id}` — revokes the token with Google and deletes the row.
23. Token refresh: every Google API call wraps token retrieval in a helper that checks expiry and refreshes if needed. Handles `invalid_grant` (user revoked via Google settings) by marking the connection as broken and surfacing a reconnect prompt.
24. UI: a "Calendar Connections" section in Settings lets the user see and manage their connected calendars across all their organizations.

### Phase 5 — Calendar Event Creation

25. Implement `app/services/calendar.py` with `create_event(connection, event_data)`. Uses `google-api-python-client` with the connection's decrypted token.
26. Event data derived from the submission: title = `"{page_title} — {submitter_name}"`, description = a formatted summary of the submission fields, start_time = submission time + 1 day by default (configurable), duration = `calendar_event_duration_min`.
27. If the form schema has a `preferred_date` or `preferred_time` field, prefer that for the event start.
28. If `calendar_send_invite` is true and the submission has an email, add `attendees: [{email: submitter_email}]` and set `sendUpdates: 'all'`.
29. Store the Google event ID in the AutomationRun metadata so we can link to it later (the submission detail view can show "Open in Google Calendar" if an event was created).
30. Handle rate limits from Google (429) with exponential backoff. Log but do not block other automations.

### Phase 6 — Reply Flow Integration

31. In the Submission reply flow (from Mission 04), wire the email send through `app/services/email.py::send_reply()`. Replies inherit the brand kit and appear as part of the same thread (use `In-Reply-To` and `References` headers with the original notification's message ID).
32. Reply replies: if the submitter responds to the confirmation email, route that reply back to the notification email set (Resend inbound webhook handles this; implement in a future pass).

### Phase 7 — Apple Calendar Stub

33. Add the Apple Calendar button in the UI but mark it "Coming soon" with a tooltip. Wire the button to a stub endpoint `POST /api/v1/calendar/connect/apple` that returns `501 Not Implemented` with a clear error message. The architecture supports adding the real implementation without a schema change.

### Phase 8 — Failure Visibility

34. Add a sticky banner to the Dashboard if any automation has failed in the last 24 hours for the active org. Banner says "Some submissions didn't notify you — [View details]" and links to a dedicated failures view.
35. Build `(app)/notifications/page.tsx` showing all AutomationRuns with status `failed` in the last 30 days, grouped by page. Each has a "Retry now" button that re-enqueues the job.
36. Email digest: if failures persist over 24h, send a daily digest to the org Owner. Controlled by a setting in Settings → Notifications.

### Phase 9 — Integration Tests

37. E2E: submission arrives → notification email sent, confirmation email sent, calendar event created. Verify the AutomationRuns are all status=success.
38. Test: notification email fails (Resend mocked to 500) → job retries, eventually marks failed, alert banner appears.
39. Test: Google token revoked → next calendar event attempt fails gracefully, surfaces reconnect prompt in UI.
40. Test: idempotency — invoking `run_for_submission` twice on the same submission does not double-send emails.
41. Test: turning off `confirm_submitter` prevents the confirmation email.
42. Test: template rendering with a complex brand kit (custom fonts, dark accent color) produces valid HTML that renders in email clients.

### Phase 10 — Documentation

43. Write `docs/runbooks/EMAIL.md`: Resend setup, DNS records, troubleshooting bounces, switching domains.
44. Write `docs/runbooks/CALENDAR.md`: Google OAuth setup for a new environment, scope management, token revocation debugging.
45. Update `docs/architecture/AI_ORCHESTRATION.md` if the automation engine benefits from any LLM-assisted intent ("should this submission auto-create an event?" is a future idea).
46. Mission report written.

---

## Acceptance Criteria

- When a submission arrives on a page with automations configured, the correct emails and calendar events are created within 30 seconds.
- Failures are visible in the UI and automatically retried with backoff.
- Google Calendar OAuth works end-to-end including token refresh.
- Reply emails are branded consistently with confirmation emails.
- Idempotency is proven: re-running a job on the same submission does not double-fire.
- All tests pass. Lint / typecheck clean.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
