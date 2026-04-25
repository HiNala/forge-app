# WORKFLOW MISSION W-01 — Contact Form with Calendar Availability

**Goal:** Build Forge's first flagship workflow end-to-end: a contact form that's more than a form. The user describes a need in plain English ("I need a way for clients to book a consultation — I'm free weekday afternoons"), Forge generates a branded contact form with real-time availability slots baked in, driven by a calendar the user has imported or connected. When a submission arrives, the chosen slot is held, an ICS invite is emailed to both parties, and (if connected) a Google Calendar event is created. After this mission, a Forge user can turn any contact form into a bookable appointment slot without thinking about scheduling software.

**Branch:** `mission-w01-contact-calendar`
**Prerequisites:** Backend Infra missions BI-01 through BI-04 complete (DB, middleware, API, settings). Orchestration mission O-01 complete (basic Studio generate returns real HTML). The `availability_calendars`, `calendar_busy_blocks`, and `integrations` tables exist and the ICS parse pipeline works.
**Estimated scope:** Medium-large. Multiple integration points — calendar parsing, availability computation, form rendering with live slots, submission handling, calendar event creation. The first workflow that demonstrates Forge's full loop.

---

## Experts Consulted On This Mission

- **Tony Fadell** — *Design the whole ecosystem. What happens before the form, during it, after it, on both sides — creator and submitter?*
- **Bill Atkinson** — *When Dan picks a time slot, does the interaction feel alive? Does the confirmation reward him?*
- **Jef Raskin** — *Is the submitter ever confused about what just happened? Did they book, or just inquire?*
- **Susan Kare** — *At a glance, does a contact form that shows Tuesday 2pm feel different from one that doesn't?*

---

## How To Run This Mission

Read User Case Report Flow 5 (Contractor small jobs form). Read the uploaded persona file — Lucy Martinez at Reds Construction wants to reduce phone tag with customers asking for small repairs. Her goal is not "receive emails." Her goal is "the next available Tuesday at 2pm consultation."

The workflow has four distinct surfaces:
1. **Creator side** — Lucy imports her business calendar ICS, configures availability rules in Settings → Calendars, and generates a contact form in Studio with a prompt like "contact form with booking, I'm free weekdays 9-5 except lunch."
2. **Live page** — Dan visits the page, describes his job, picks a slot from real availability, hits submit.
3. **Backend** — The submission is stored, the slot is tentatively held, the automation chain fires.
4. **Both parties' inboxes** — Dan gets a confirmation with an ICS attachment. Lucy gets a notification. Both calendars get the event.

Commit on milestones: calendar settings UI, availability computation tested, Studio produces form with slot picker, live page renders slots from API, submission creates calendar events, email chain works end-to-end.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Calendar Configuration Surface

1. Build `(app)/settings/calendars/page.tsx` in the frontend (plug into the existing Settings tab strip). Three sections:
    - **Connected calendars** — list of `availability_calendars` rows. Each card shows: name, source (ICS file / ICS URL / Google), last synced, status badge.
    - **Add calendar** — three options laid out as clickable cards:
        - **Upload ICS file** — drag-drop .ics, immediate parse preview.
        - **Subscribe to ICS URL** — paste a URL (e.g., Google Calendar's public ICS URL), backend polls hourly.
        - **Connect Google Calendar** — OAuth (already wired in BI-03). Uses the live Calendar API instead of ICS polling.
    - **Availability rules** — per-calendar config: business hours per weekday (with a friendly time-range picker), buffer before / after, minimum notice (default 24h), maximum advance (default 60d), slot duration (15/30/45/60/90).
2. The form uses the auto-save pattern from F03. Every change PUTs to `PATCH /api/v1/calendars/{id}` with a 500ms debounce.
3. First-class empty state: "Import a calendar to start offering appointment slots." Primary CTA opens the Upload option.
4. Real-time feedback when uploading an ICS: backend parses, returns `{event_count, date_range, business_hours_suggested}`. Frontend shows a preview card — "Found 48 events between Apr 15 and Jun 15. Most activity between 9am and 5pm on weekdays. Apply suggested rules?" with an Apply button that fills the availability rules automatically.

### Phase 2 — ICS Parsing Pipeline Hardening

5. Upgrade `app/services/calendar/parse.py` to handle real-world calendar weirdness:
    - **Recurrence rules:** use `recurring-ical-events` to expand RRULEs into concrete occurrences in a 6-month window. Cap at 10,000 occurrences to prevent OOM on pathological recurrences (e.g., "every minute forever").
    - **Timezones:** use Python 3.12's `zoneinfo`. Normalize all `starts_at` and `ends_at` to UTC for storage. Keep the original tzid in `metadata` for display.
    - **EXDATE / EXRULE:** respect exclusions so "every Tuesday except Christmas week" parses correctly.
    - **All-day events:** flag in metadata. Default behavior: all-day events block the WHOLE day. Configurable per-calendar (`all_day_events_block` flag).
    - **Transparency:** skip events with `TRANSP:TRANSPARENT` (marked free/busy: free).
    - **Status:** skip events with `STATUS:CANCELLED`.
    - **Malformed events:** skip with a warning log, don't fail the whole parse.
6. Idempotent insert pattern: instead of trying to UPSERT per event, wipe all `calendar_busy_blocks` for the calendar on each sync and re-insert. Simpler, and the volumes (thousands of rows) handle this fine.
7. Emit a sync summary on completion — stored on `availability_calendars.last_sync_summary` (JSONB): `{event_count, busy_block_count, recurrence_expansions, warnings: [...], duration_ms}`.
8. The `ics_calendar_sync` worker job from BI-03 now calls this full pipeline. For `source_type='ics_url'`, the worker fetches the URL with a 30s timeout and a 5MB body limit. Handles 304 Not Modified by caching the ETag in `metadata`.

### Phase 3 — Availability Computation (Server-Side)

9. Complete `app/services/calendar/availability.py` with the full algorithm:
    ```
    def compute_slots(calendar_id, date_from, date_to, duration_minutes, timezone_hint):
        calendar = load_calendar(calendar_id)
        busy = load_busy_blocks(calendar_id, date_from - buffer_before, date_to + buffer_after)
        
        slots = []
        for date in daterange(date_from, date_to):
            if date < min_notice_threshold: continue
            if date > max_advance_threshold: continue
            
            hours = calendar.business_hours[date.weekday()]
            if not hours: continue  # e.g., weekends closed
            
            for (day_start, day_end) in hours:
                cursor = day_start
                while cursor + duration <= day_end:
                    slot_start = cursor
                    slot_end = cursor + duration
                    
                    # Apply buffers: block a slot if a busy block is within buffer distance
                    slot_with_buffers = (slot_start - buffer_before, slot_end + buffer_after)
                    if any(overlaps(slot_with_buffers, b) for b in busy):
                        cursor += slot_increment
                        continue
                    
                    slots.append({
                        "start": slot_start.isoformat(),
                        "end": slot_end.isoformat(),
                        "timezone": calendar.timezone,
                    })
                    cursor += slot_increment
        
        return slots
    ```
10. Slot increment defaults to `slot_duration_minutes` but can be shorter (e.g., 15-min slots for 30-min appointments = more granular offerings).
11. Performance: for a 4-week window with 30-min slots and 9-5 business hours, ~160 candidate slots per week. Computation is microseconds; the DB query for busy blocks is the bottleneck. Index on `(calendar_id, starts_at, ends_at)` handles this.
12. Cache the result in Redis: key `availability:{calendar_id}:{date_from}:{date_to}:{duration}`, TTL 5 minutes. Invalidate on calendar sync, on availability rule change, on slot-hold creation.

### Phase 4 — Slot Holds (Soft Reservations)

13. New table:
    ```sql
    CREATE TABLE slot_holds (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      calendar_id UUID NOT NULL REFERENCES availability_calendars(id) ON DELETE CASCADE,
      page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      slot_start TIMESTAMPTZ NOT NULL,
      slot_end TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','expired')),
      submission_id UUID,
      expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      EXCLUDE USING gist (calendar_id WITH =, tstzrange(slot_start, slot_end) WITH &&)
        WHERE (status IN ('pending','confirmed'))
    );
    ```
    The `EXCLUDE` constraint prevents double-booking at the database level. Requires `btree_gist` extension.
14. `POST /p/{page_slug}/availability/hold` — public endpoint called when a submitter clicks a slot in the form. Payload: `{slot_start, slot_end}`. Creates a `pending` hold, returns `{hold_id, expires_at}`. Frontend stores this and includes `hold_id` in the actual submit.
15. `DELETE /p/{page_slug}/availability/hold/{hold_id}` — called if the user backs out.
16. Periodic worker cron `expire_pending_holds` runs every 2 minutes, flips any `pending` hold past `expires_at` to `expired`.
17. On successful submission: the hold flips to `confirmed` atomically. If the hold has already expired, the submit fails with a friendly error and returns fresh availability so the user can pick another slot.

### Phase 5 — Studio Generation With Booking Block

18. Extend the Studio intent parser (handled fully in the orchestration mission track O-02) to detect booking intent. Keywords: "booking", "appointment", "schedule", "reserve", "available times", "pick a time". When detected:
    - Intent JSON includes `booking: {enabled: true, calendar_id?, duration_minutes?}`.
    - If multiple calendars exist, the compose step prompts an intent clarification, but only AFTER a first draft renders. Forge never blocks on a question.
19. The Composer (orchestration mission O-03) receives a `booking_context` if the intent says so. Its component library includes:
    - **Slot picker block** — a dedicated component with:
        - A 2-week date strip at the top (horizontally scrollable on mobile).
        - Vertical list of available times for the selected date.
        - "Show more times" expander for busy days with many slots.
        - "Next available" shortcut that jumps to the soonest slot.
        - Timezone indicator ("All times shown in Pacific Time / your local time").
    - The picker hits `GET /p/{slug}/availability?date_from=...&date_to=...&duration=...` for real slots.
20. The generated HTML includes a hidden `<input name="__selected_slot" />` that the slot picker's JS populates. If no calendar is configured, the picker gracefully omits — the form still works as a plain contact form. This is the "give them output before asking more questions" principle from the user brief.

### Phase 6 — Live Page Slot Picker (Injected JS)

21. The public page's injected script (from the Mission 04 backend public page serving) is extended to include the slot picker behavior:
    ```javascript
    // Inlined into the published page, CSP-allowed by hash
    (function forgeSlotPicker() {
      const picker = document.querySelector('[data-forge-slot-picker]');
      if (!picker) return;
      const pageSlug = picker.dataset.pageSlug;
      const duration = parseInt(picker.dataset.duration, 10);
      
      async function loadSlots(dateStart, dateEnd) {
        const res = await fetch(`/p/${pageSlug}/availability?date_from=${dateStart}&date_to=${dateEnd}&duration=${duration}`);
        return res.ok ? res.json() : {slots: []};
      }
      
      // ... render date strip, slot list, hold on click
    })();
    ```
22. On slot click:
    - Immediately hit `POST /p/{slug}/availability/hold` with the selected slot.
    - On success: visually confirm the selection (teal highlight, Cormorant time display "Tuesday, Apr 21 at 2:00 PM"), store `hold_id`, enable the Submit button.
    - On failure (slot gone): show "That time just got booked — here are the next available." Re-render with fresh slots.
23. Submit button includes the `hold_id` in the form data. Backend's submission handler validates the hold is still `pending` and matches the submitting visitor's IP+user-agent fingerprint (basic bot resistance).
24. Accessibility: the slot picker is keyboard navigable. Arrow keys move between slots, Enter selects. Every slot button has `aria-label="Book 2:00 PM on Tuesday, April 21"`.

### Phase 7 — Submission + Calendar Event Creation

25. Extend `submissions` flow in the backend: when a submission arrives with `__selected_slot` data, the service:
    - Confirms the hold (flips to `confirmed`, attaches `submission_id`).
    - Enqueues a `calendar_create_event` worker job with the submission and slot context.
    - Returns success to the submitter.
26. The `calendar_create_event` worker job's behavior varies by calendar source:
    - **Google Calendar integration present:** use the Google Calendar API (`events.insert` on the org's connected calendar). Include attendee (submitter email), send invite. Save the external event ID back on `submissions.calendar_event_id`.
    - **ICS-only (no live sync possible):** create an ICS file attachment in-memory (using `icalendar`), attach to the confirmation emails to both parties. No server-side calendar update possible.
27. The ICS attachment format:
    ```
    BEGIN:VCALENDAR
    VERSION:2.0
    PRODID:-//Forge//EN
    BEGIN:VEVENT
    UID:{submission_id}@forge.app
    DTSTAMP:<now>
    DTSTART:<slot_start>
    DTEND:<slot_end>
    SUMMARY:Consultation with {org.name}
    DESCRIPTION:Booked via {page.url}
    ORGANIZER;CN={org.name}:MAILTO:{org.primary_email}
    ATTENDEE;CN={submitter_name}:MAILTO:{submitter_email}
    LOCATION:{page.location or ''}
    STATUS:CONFIRMED
    END:VEVENT
    END:VCALENDAR
    ```
28. Even with Google Calendar, ALSO send the ICS attachment — it's a resilience measure. If Google's API is momentarily down, the attachment still lets the submitter add it to their calendar.

### Phase 8 — Email Experiences (Branded)

29. **Owner notification email** — subject "New booking from {submitter_name} — {slot_readable}". Body includes: submitter name, email, phone, description of what they need, the booked time, a link to the submission in Forge. Uses the org's `notify_owner_body` template override if present.
30. **Submitter confirmation email** — subject "Your appointment with {org.name} is confirmed — {slot_readable}". Body includes: branded header (logo + accent color), confirmation of the slot, what to expect, cancel/reschedule link (magic link to a simple public page), location/contact info, ICS attachment.
31. **Cancel/reschedule flow:** the magic link routes to `/p/{slug}/bookings/{booking_token}` — public page with "Cancel my booking" and "Reschedule" actions. Cancel flips the hold to `cancelled` and queues a cancellation email to both parties. Reschedule shows the slot picker again.
32. Both emails render via a small React-email or MJML template system (decide based on the Mission 05 backend email infra). Preview-able from the Admin impersonation view.

### Phase 9 — Page Detail Integration

33. The Page Detail's Submissions tab (from F-05) shows each booking submission with a **dedicated visual treatment**: a small calendar chip next to the normal submission row with the booked slot. Expand-in-place shows the full booking: slot, cancel/reschedule history, calendar_event_id link (opens Google Calendar if present).
34. Add a "Bookings" quick-filter at the top of the Submissions tab — shows only submissions with a confirmed slot. Useful for Lucy to see her upcoming week at a glance.
35. A "Today's bookings" widget on the Dashboard's Overview section of form pages with booking — surfaces the slots scheduled for today and tomorrow.

### Phase 10 — Admin & Conflict Handling

36. If a Google Calendar event creation fails (API error, quota), the submission still succeeds and the automation_job retries. After 3 failures, the org Owner gets an in-app notification "We couldn't sync your booking with Google Calendar — click here to reconnect". Cancel flows still work via ICS attachment fallback.
37. If the calendar is manually edited AFTER a booking (e.g., Lucy double-books by accident in Google Calendar), Forge detects this on the next sync (every hour for ICS URL, real-time webhook for Google Calendar integration). Conflicting bookings get flagged in the UI and an alert email goes to the Owner: "Heads up — the 2pm Tuesday booking from Dan overlaps with an event you added to your calendar."
38. Timezone nuance: every slot stored in UTC. Display in the submitter's local timezone on the public page (detected via JS `Intl.DateTimeFormat().resolvedOptions().timeZone`). Display in the creator's timezone in the admin view.

### Phase 11 — Tests & Edge Cases

39. Test: import an ICS with weekly RRULE, verify 12 weeks of expansions.
40. Test: import an ICS with EXDATE, verify exclusion applied.
41. Test: compute availability for a calendar with no busy events, verify all business-hours slots present.
42. Test: compute availability with a busy event spanning a slot + buffer, verify adjacent slots are blocked per buffer setting.
43. Test: two concurrent hold requests for the same slot — the EXCLUDE constraint makes exactly one succeed, the other returns 409.
44. Test: hold expires after 15 min without a submit, slot returns to availability.
45. Test: full happy path — create page with booking, visit public URL, select slot, submit, verify confirmation email with ICS, verify owner notification, verify Google Calendar event created (mock the Google API in tests).
46. Test: JS-disabled fallback — submitting the form without a selected slot (because the picker requires JS) degrades gracefully to a plain contact form submission without booking. Owner gets a non-booking submission notice.
47. Test: daylight saving transitions. Book a slot on a DST-transition day, verify the slot times are correct in both timezones.
48. Accessibility: slot picker is keyboard-navigable and announces correctly to screen readers.

### Phase 12 — Documentation & Polish

49. Write `docs/workflows/CONTACT_WITH_BOOKING.md` — user-facing concept docs explaining how the workflow behaves, with screenshots.
50. Write `docs/runbooks/CALENDAR_DEBUGGING.md` — common issues (ICS won't parse, slots not appearing, Google API quota), how to diagnose.
51. Record a 2-minute demo video showing: import calendar, generate page in Studio, submit a test booking, check emails + calendar.
52. Mission report.

---

## Acceptance Criteria

- User can import an ICS file, configure availability rules, and see a preview.
- Studio generation with a booking prompt produces a page with a functional slot picker.
- Slot picker renders real availability from the backend, with timezone awareness.
- Submissions create confirmed bookings with ICS attachments and optional Google Calendar events.
- Double-booking is impossible at the database level.
- Cancel/reschedule flows work for submitters via magic link.
- Timezone and DST edge cases handled correctly.
- JS-disabled fallback degrades gracefully.
- Page Detail shows booking-specific UI.
- All tests pass; end-to-end demo works.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
