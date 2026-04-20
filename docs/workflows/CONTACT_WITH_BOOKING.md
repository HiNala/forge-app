# Contact form with booking

Forge can attach **real calendar availability** to a public contact flow: visitors pick a time that respects your busy blocks and availability rules, submit the form, and both sides receive confirmation (with optional Google Calendar sync when integrations are enabled).

## Creator flow

1. Open **Settings → Calendars**, import an `.ics` file or subscribe to a public `.ics` URL.
2. Set **business hours** (weekday windows), buffers, notice windows, and slot length.
3. In Studio, describe a page that should include booking (“contact form with appointment slots”).
4. Publish the page.

## Visitor flow

1. Open the published `/p/{org}/{page}` URL.
2. Fill the form; if booking is enabled, the slot picker loads availability from `GET /p/{org}/{page}/availability`.
3. Selecting a slot calls `POST .../availability/hold` to reserve it briefly.
4. Submitting includes `hold_id`; the backend confirms the hold and stores booking metadata on the submission.

## Operational notes

- Slots are computed in **UTC** and labeled with the calendar’s IANA timezone id for display.
- Double booking is prevented by a **PostgreSQL `EXCLUDE`** constraint on overlapping pending/confirmed holds for the same calendar.
- See `docs/runbooks/CALENDAR_DEBUGGING.md` when something looks wrong.
- Implementation status and test notes: `docs/plan/MISSION_W01_REPORT.md`.
