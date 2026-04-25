# FINAL MISSION — Boot The Stack, Walk The Product, Fix Everything You Touch

**Goal:** Take every mission's output — backend, frontend, orchestration, workflows, settings, design — boot the full stack locally, and *actually use the product* the way a real user would. Every broken link, every sluggish interaction, every misaligned pixel, every copy inconsistency, every empty state that didn't load, every animation that stuttered, every API that returned the wrong shape — find it and fix it. After this mission, Forge isn't "done because every mission's acceptance criteria passed individually." Forge is done because someone sat down and used it as a human and walked away saying "that worked."

**Branch:** `mission-final-smoke-test-polish`
**Prerequisites:** Every prior mission complete. Every PR merged to main. All tests green in CI.
**Estimated scope:** This is the longest mission in elapsed time, the shortest in new code. It's the difference between a product and a collection of features. Plan for a full day minimum; probably two.

---

## Experts Consulted On This Mission

- **Steve Jobs** — *Use it every day. What's the first thing that feels wrong? Fix that.*
- **Tony Fadell** — *The whole ecosystem. Does every loop close?*
- **Jef Raskin** — *Every mode, every hesitation, every "what do I click?" moment is a bug.*
- **Don Norman** — *When something breaks, is the user given what they need to recover?*
- **Bill Atkinson** — *Is the product alive, or merely functional?*

---

## How To Run This Mission

**Do not skim through this.** Run every flow end-to-end. Use a real browser, a real keyboard, a real phone. Take screenshots. Take notes. Fix things on the branch as you find them — don't batch up "I'll fix these later." The psychology of this mission is simple: if you walked through the product and didn't find ten things to fix, you weren't paying attention. Forge is complex; polish is infinite; this is about fixing the most visible issues first and ensuring the whole product feels coherent.

Work alone for the first pass, then invite a second person (ideally someone unfamiliar with Forge) for a usability round. Their confusion is a map.

Commit **small, frequent, descriptive** fixes as you go: `fix(studio): section edit popup clipped on tablet`, `perf(dashboard): debounce search input to 200ms`, `copy(proposal): "Accept this proposal" — clearer than "Submit"`, `a11y(sidebar): announce collapse state to screen readers`. Each commit is self-contained. Each push is green in CI.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Clean Boot

1. Start from a fresh clone on a machine that hasn't built Forge before. This is the critical test — will a new engineer / a new Railway instance / a new contractor be able to bring this up?
2. Read the top-level `README.md`. Does it tell you what to do? If any step is missing, vague, or wrong — fix the README now, before trying to boot. The README is the onboarding document.
3. Run `docker compose up --build`. Observe the full build. Every image should build cleanly in under ~10 minutes on a modern laptop. If any step errors, slows, or emits warnings, investigate. Common fixes: pin Node/Python versions in Dockerfiles, add missing system deps to base images, fix .dockerignore to exclude node_modules and __pycache__.
4. Wait for the stack to come up. Tail logs. All services (api, worker, web, caddy, postgres, redis, minio) should reach healthy state within 90 seconds. If anything crashes in a restart loop, fix it.
5. Run `docker compose exec api alembic upgrade head` — database migrations complete without errors.
6. Run `docker compose exec api python -m scripts.seed_dev` — seed data loads idempotently (test this — run it twice, no errors).
7. Run all tests inside the containers: `docker compose exec api pytest`, `docker compose exec web pnpm test`. All green. If not, FIX before moving on.
8. Visit `http://localhost:3000` (marketing) and `http://localhost:3000/app` (authenticated). Both load. The marketing page renders with the seeded brand styling. The app redirects to sign-in.

### Phase 2 — The First-Time User Journey

9. Sign up as a brand new user with a test email. Walk through onboarding with the picker step. Pick "Contact form" as the first workflow. Land in Studio.
10. Everything you observe during this journey is a data point. Pay attention to:
    - How long between clicks does the UI feel "stuck"?
    - Are loading states smooth or jarring?
    - Do any errors appear in the browser console? Fix every console error.
    - Do any errors appear in the backend logs? Fix every warning-or-higher log entry that shouldn't be there.
    - Does the Studio empty state correctly pre-prime the input with the workflow starter prompt?
11. Type the prompt: "Contact form for my plumbing business — I'm Rick's Plumbing in Petaluma, been in business since 2005, I'd like a way for people to request service and pick a time". Submit.
12. Watch the SSE stream. Are the `context.*`, `intent`, `plan`, `compose.*`, `review.*`, `persist`, `done` events all firing? Is the preview pane updating smoothly as chunks arrive? Any flicker? Any full-iframe reloads that shouldn't be happening?
13. End state: a contact form with (or without, based on calendar availability at this stage) a slot picker, with Petaluma-flavored copy. Quality score visible. Artifact card in chat.
14. **If any of this is broken** — if the SSE stops midway, if the preview flickers violently, if the generated page has "Lorem Ipsum" anywhere, if the quality score is 0 — STOP. Fix it before continuing.

### Phase 3 — Studio Interaction

15. Click a section of the generated preview. Edit popup appears. Type "Make the headline shorter and more direct." Submit.
16. Watch the section swap. Is the crossfade smooth? Is ONLY the target section changing or is the whole page re-rendering? Fix any full-page re-renders during section edits.
17. Try three more refine chips from the panel. Observe speed, quality, consistency.
18. Switch provider via the Studio dropdown (OpenAI → Anthropic → Gemini). Verify each provider produces a valid page. If Anthropic or Gemini fails on structured output, check the fallback chain fires correctly.
19. Try a deliberately ambiguous prompt: "a page for my thing". The clarify chips should appear. Click one; generation should continue cleanly.
20. Open the preview in a new tab. The public page (with edit mode off) should load at the `/p/{slug}` URL and work. Submit a test response. Verify it arrives in the admin.

### Phase 4 — Publishing & Public Page

21. Click Publish on the page. Modal appears asking for a slug. Confirm.
22. Visit the published URL. Does it load in < 300ms? (Use network throttling to simulate 4G — should still feel fast.)
23. Fill out the form. Pick a slot if booking is present. Submit.
24. Success confirmation appears. No console errors. Analytics events fire (check the Network tab — `/track` calls going out).
25. In another browser tab (as the owner), check the Submissions tab on Page Detail. The submission appears within 30 seconds (polling).
26. Test the JS-disabled path: open dev tools, disable JavaScript, reload the public page. Submit again with JS off. The backend accepts it; the response is a server-rendered success page. If this is broken, it's critical — fix.

### Phase 5 — Calendar & Booking

27. Go to Settings → Calendars. Upload a small ICS file (create a test one with 5 events on known dates). Observe the parse preview.
28. Configure availability rules: weekdays 9-5, 30-min slots, 1-hour buffers.
29. Go back to Studio, generate a contact form with booking. The slot picker should render. Pick a slot. Verify the hold was created (check the DB: `SELECT * FROM slot_holds;`).
30. Submit a test booking. Verify the slot is confirmed, an ICS attachment is in the confirmation email (check Resend dashboard or dev inbox), an owner notification email arrives.
31. Edge cases to test:
    - Pick a slot, wait 16 minutes, try to submit → should fail with "That time was just taken, here are fresh options".
    - Two browsers pick the same slot simultaneously → one succeeds, one fails cleanly with the 409 handling.
    - Pick a slot in a different timezone (change system timezone) → slot displays correctly localized on the public page, stored correctly in UTC on the backend.

### Phase 6 — Proposal Workflow

32. Create a new page in Studio with the prompt: "Proposal for a 12-foot cedar privacy fence for the Johnson property at 1234 Maple — 3 days labor at $65/hr, materials $2,400, start next Monday".
33. Verify the generated proposal has every mandatory section (cover, summary, scope, exclusions, line items, timeline, terms, acceptance). Check the math — line items must sum to the subtotal.
34. Edit a line item inline. Verify totals recompute in real time.
35. Publish. Open the public URL as if you were the client. Read the proposal top-to-bottom. Click Accept with each of the three signature methods (click, typed, drawn). Verify the signed PDF generates and is attached to the confirmation email.
36. Test change orders: go back to the Page Detail, click "Create change order". Edit something. Publish. Verify the parent is marked superseded, the child has `parent_proposal_id` set, both are reachable.
37. Test question flow: as a client, click the ? icon on a section. Submit a question. As the owner, answer it. Verify both sides receive appropriate notifications.

### Phase 7 — Pitch Deck Workflow

38. Create a deck in Studio with: "Series A pitch for my AI-powered coffee shop app, we have 12k DAU and $80k MRR, raising $3M".
39. Watch the deck generation. Verify outline → expand stages stream correctly. Slides appear in the preview as they complete.
40. Wait for image generation. Verify images arrive progressively (shimmer skeleton → final image fade-in).
41. Open presenter mode. Press arrow keys. Verify smooth transitions. Test the presenter-view on a second window (`?presenter=true`).
42. Export to PDF. Verify the downloaded file is page-per-slide, fonts embedded, images present.
43. Export to PPTX. Open in PowerPoint or Keynote. Verify slides are editable, charts are native (not images), speaker notes are populated.

### Phase 8 — Dashboard, Settings, & Admin Surfaces

44. Dashboard: verify all three pages (contact, proposal, deck) appear with correctly-colored page-type chips, live thumbnails (not placeholder rectangles), correct metadata.
45. Filter by each page type — list updates. Search — debounced correctly.
46. Empty states: archive one page, filter to Archived, verify treatment. Clear all filters on a fresh org, verify the warm empty state.
47. Settings → Profile: change timezone. Verify "Good morning" greeting adjusts on next page load.
48. Settings → Brand Kit: change the primary color. Observe the live mini-preview update. Save. Open Studio. Generate a new page. Verify the new color is applied to the generated page.
49. Settings → Team: invite a second email (use a real email you control). Verify the invitation email arrives, the magic link works, the invitee can accept and land in the correct org.
50. Settings → Billing: verify current plan shown, usage meter accurate. Click "Upgrade to Pro" — Stripe checkout loads. Complete a test purchase with Stripe test card `4242 4242 4242 4242`. Verify webhook processes, plan flips to Pro, usage meter updates.
51. Settings → Integrations: click "Connect Google Calendar". OAuth round-trip completes. Return to app with the integration marked active.
52. Settings → API tokens: create one. Copy the token. Use it with `curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/pages` — should return the pages list. Revoke it. Same curl → 401.
53. Settings → Custom domains (Pro+): add a domain. Verify DNS instructions are shown. (Real DNS verification tested in staging.)
54. Settings → Webhooks: create an outbound webhook pointing at a test receiver (webhook.site or similar). Trigger an event (submit a form). Verify the webhook fires with correct signature.
55. Settings → Data: request a full org export. Verify the worker job runs, a download link arrives via email within a few minutes.

### Phase 9 — Analytics

56. With several pages live and some test submissions, verify the Analytics tab on each page type:
    - Form analytics: funnel renders, per-field drop-off shows.
    - Proposal analytics: scroll depth histogram, section dwell heatmap, decision status.
    - Deck analytics: presentations log, viewer sessions, slide dwell.
57. Verify the org-wide Analytics page shows aggregate metrics correctly.
58. Verify **NO fake numbers** appear anywhere. Every empty state is warm and real — a form with no submissions shows "Share your page to start seeing data", not a flat-line chart.
59. Verify date range selector works and URL-syncs.
60. Verify CSV export on submissions produces a valid CSV with real data.

### Phase 10 — Accessibility Walk

61. Close the mouse. Navigate the entire app with keyboard only — signin, onboarding, studio, dashboard, page detail, settings. Any surface where focus gets lost, focus order is illogical, or you can't reach something — fix it.
62. Run axe-core DevTools on every major screen. Fix every violation.
63. Turn on a screen reader (VoiceOver on Mac, NVDA on Windows). Walk the signup → create page → submit flow. Listen to every announcement. Fix any that are confusing, missing, or wrong.
64. Enable reduced-motion in OS. Verify all non-essential animation disables gracefully; state is still communicated via color/position.
65. Zoom to 200%. Verify no content is cut off, no horizontal scrolling appears on reasonable screens, touch targets remain large enough.

### Phase 11 — Mobile & Responsive Pass

66. Open the app on a real phone (or realistic emulation in DevTools — iPhone SE, iPhone 15, Pixel 8, iPad).
67. Sign in, walk through Studio. The active state: chat panel full-screen, preview accessible via a floating button.
68. Generate a page. Preview it. Edit a section via tap (long-press threshold should be reasonable — not accidental).
69. Dashboard on mobile — card grid collapses to single column, filters scroll horizontally.
70. Settings on mobile — tab strip scrollable, forms stack, inline save indicators reposition.
71. Public forms on mobile — slot picker works with touch, file uploads work.

### Phase 12 — Cross-Browser

72. Test on Safari (Mac and iOS), Chrome (desktop and Android), Firefox, Edge. Look for:
    - `backdrop-filter` issues (Safari).
    - `:has()` selector support (older Safari versions).
    - Date/time input styling differences.
    - iframe sandbox attribute nuances.
    - CSS scroll-snap in deck presentation mode.
73. Fix any regressions with appropriate fallbacks or progressive enhancement.

### Phase 13 — Error Path Thoroughness

74. Kill the database connection (`docker compose stop postgres`). Try to use the app. Errors should be friendly, not raw stack traces. `/health/deep` should report postgres down.
75. Restart postgres. App recovers without restart.
76. Kill Redis. Rate limiting degrades to "allow" (or "best effort"). Auth cache falls through to DB. Fix anything that hard-crashes on Redis down — it's a soft dependency.
77. Inject a rate limit: hit a Studio generate endpoint 15 times rapidly. Verify 429 with Retry-After. Frontend shows friendly "You're moving fast, give it a second" message.
78. Trigger quota exceeded: drop the org's plan limits in the DB to 1 page, try to generate a second. 402 with upgrade path. UI surfaces the upgrade prompt.
79. Provide an invalid LLM API key in env. Start the app. Try to generate. Fallback chain fires; user eventually sees "AI is unavailable right now, try again in a moment" with zero stack trace leaked.

### Phase 14 — Performance Budget

80. Run Lighthouse on every major route:
    - Marketing / — target ≥ 95 mobile, fix anything below.
    - /signin, /signup — ≥ 95.
    - /dashboard — ≥ 90.
    - /studio — ≥ 85 (iframe cost acceptable).
    - /pages/[id] — ≥ 90.
    - /settings/* — ≥ 92.
    - Public pages /p/* — ≥ 95 (most important).
81. For any route below target, profile. Common culprits: too-large JS bundles (code-split), blocking fonts (use `next/font` with display swap), unoptimized images (use `next/image`), render-blocking CSS.
82. Bundle size audit per route. Each route's gzipped JS:
    - Marketing: < 80KB.
    - Dashboard: < 200KB.
    - Studio: < 350KB.
    - Public page: < 20KB (just tracker + submission handler).
    Fix any route over budget.

### Phase 15 — Copy & Language Audit

83. Read every user-facing string in the app. Write down each phrase that feels:
    - Robotic ("An error has occurred").
    - Apologetic ("We apologize for the inconvenience").
    - Jargony ("the upstream dependency returned a 5xx").
    - Condescending ("As you can see…").
    - Vague ("Something went wrong").
84. Fix each. The house voice: warm, specific, concise, never condescending. Examples:
    - "An error has occurred" → "That didn't work. Try again, and if it keeps happening, reach out — we're here."
    - "Cannot save" → "Your workspace name needs to be unique. Try adding a location or year, like 'Reds Construction 2026'."
    - "Please authenticate" → "Sign in to continue."
85. Verify every button label is a verb: "Publish page", "Send invite", "Start free trial", "Save changes". No "Submit" or "OK" anywhere unless context makes it specific.

### Phase 16 — Visual Polish

86. Walk every screen at the designer-reference zoom level. Compare against the designer's artifact. Any drift from the design tokens, the typographic scale, the spacing system, the corner radii, the shadow values — fix.
87. Common drift points:
    - Hard-coded hex colors (grep for `#[0-9a-f]{6}` in Tailwind classes outside of tokens).
    - Inline styles in React components (should be Tailwind utilities or CSS-variable references).
    - Inconsistent button sizes across similar contexts.
    - Icon sizing (16px in UI, 20px in primary CTAs, 14px in dense rows).
    - Heading weights (Cormorant 600 for display, never Manrope 700 anywhere).
88. Run the motion coherence pass from F-07 again — every surface should animate at the documented tempos.

### Phase 17 — Onboarding A Second Person

89. Bring in a second human — ideally someone who hasn't seen Forge before and isn't an engineer. A designer, a marketer, a non-tech friend.
90. Ask them to "build a contact page for a fake business". Watch in silence. Take notes. Every time they hesitate, frown, or re-read something, that's a bug.
91. Don't intervene unless they genuinely can't proceed. After the walkthrough, ask:
    - What did you expect to happen at any point that didn't?
    - What confused you?
    - What felt good?
    - Would you use this?
92. Fix the top 5 issues from their feedback the same day.

### Phase 18 — The Polish List You've Been Accumulating

93. By this point you've written down dozens of fixes as you walked. Work through that list. Commit each fix small, descriptively, with clear intent. No "polish" commits.
94. Re-verify each area after fixes: don't trust that a fix didn't break something else.
95. Final pass on automated tests — if you changed anything, re-run the full suite. `pnpm test`, `pytest`, `pnpm lint`, `uv run ruff check`, `mypy --strict`, `tsc`. All green.

### Phase 19 — Documentation Reality Check

96. `README.md` → the onboarding instructions match reality (re-test from scratch on a clean machine if you changed anything).
97. `docs/runbooks/*` → each runbook is current. The DEPLOYMENT runbook reflects the actual Railway setup. The INCIDENT_RESPONSE runbook has correct Slack/PagerDuty channels.
98. `docs/architecture/*` → the diagrams and descriptions match the code.
99. `CHANGELOG.md` — if one exists, add a "1.0.0 — Launch" entry summarizing the shipped scope.

### Phase 20 — Final Stack Health Check

100. All services green in `docker compose ps`.
101. `curl http://localhost:8000/health/deep` returns all-green JSON for every dependency.
102. `/metrics` endpoint returns Prometheus-format metrics.
103. Sentry test event fires correctly (intentional `raise Exception("smoke test")` in a dev endpoint, check Sentry).
104. Test email via Resend sends (trigger an invitation, verify delivery).
105. Test Stripe charge completes (via test card).
106. Test Google Calendar event creates (via connected integration).
107. Background worker is processing jobs (check arq dashboard or logs).
108. Database has expected row counts (> 0 pages, > 0 submissions, > 0 revisions on the seed org).
109. Redis cache is warm (sample a few keys; they exist).
110. Object storage (MinIO in dev, R2 in prod) has brand logos + preview screenshots.

### Phase 21 — Demo Dry-Run

111. Pretend you're demoing Forge to a prospective user. Record a 5-minute screen recording where you:
    - Sign up.
    - Pick a workflow in onboarding.
    - Describe a page in Studio.
    - Watch it build.
    - Edit a section by clicking it.
    - Publish.
    - Submit on the public page.
    - See the submission arrive.
    - Reply inline.
    - Check analytics.
112. Watch the recording. If anything about it feels "off" — a slow load, a stuttered transition, a moment of confusion — that's your next fix.
113. The demo should feel effortless. If it doesn't, it's not ready. Go back to Phase 18 and fix more.

### Phase 22 — Mission Report

114. Write `docs/missions/MISSION-FINAL-REPORT.md`. Include:
    - What you fixed (the full commit list, roughly categorized).
    - What you found and decided NOT to fix (tracked as issues for post-launch).
    - What you couldn't verify (e.g., real custom domain TLS — deferred to staging).
    - The final Lighthouse scores per route.
    - The final axe-core violation count (should be zero).
    - The final test coverage percentage.
    - The list of outstanding known issues, in priority order.
    - A single-paragraph subjective assessment of product quality from your walkthrough.
115. Commit the report. Push. Open a PR. Once merged, tag the release: `v1.0.0`.

---

## Acceptance Criteria

- Full stack boots cleanly from a fresh clone in under 10 minutes.
- A new user can complete signup → first published page in under 10 minutes of real use.
- All three flagship workflows (contact + calendar, proposal, pitch deck) work end-to-end without errors or confusing states.
- All settings surfaces are functional.
- Stripe checkout → plan change → quota adjustment works end-to-end.
- No console errors, no unhandled backend exceptions, no 500 responses in logs.
- Lighthouse targets hit for every route.
- WCAG AA compliance verified with zero axe-core violations.
- Mobile, tablet, desktop layouts all work across Chrome, Safari, Firefox, Edge.
- Every copy string passes the "Lucy's coworker" tone test.
- Visual design matches the designer's artifact within documented tolerances.
- A second human completes a full flow with no intervention needed.
- Demo recording shows a smooth, fast, delightful experience.
- Mission report is complete, specific, and honest.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**

---

## What "Done" Means

Forge is done when a prospective user visits `forge.app`, signs up in under 90 seconds, describes what they want in one sentence, watches Forge build it in less than 30 seconds, publishes the page without friction, receives their first submission within the next day, replies to it without leaving the app, and tells a friend "you should try this." 

Every mission before this one built the machine. This mission checks that the machine works for a human. Anything less than that is not done.
