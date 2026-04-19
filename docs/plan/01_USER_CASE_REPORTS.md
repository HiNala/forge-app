# FORGE — User Case Reports & User Flows

**Project:** Forge — AI-Powered Mini-App Builder
**Document Purpose:** Extract every user behavior, flow, and expectation from the design conversation and turn it into concrete, agent-readable user cases. Every flow here is the contract for what the product must do.
**Audience:** Coding agents, backend engineers, frontend engineers, product.
**Version:** 1.0

---

## 0. Who We Are Building For

Forge is not a developer tool. It is a tool for the person sitting next to the developer. The primary user is someone like Lucy — an office manager, an executive assistant, a small-business owner, a creative freelancer — who has a specific real-world need for a single small web page and no interest in becoming a web designer to get it. The user does not say "I want to build an app." They say "I need a small jobs booking page for Reds Construction by Friday." Forge translates that intent into a finished, shareable, hosted page, and then gives the user an admin surface to manage what happens after the page is live (submissions, email notifications, calendar sync, small tweaks, analytics).

There is a secondary user: the end customer who lands on the generated page and fills out the form. They are not the paying user, but they are absolutely a user of the product — and their experience on the generated page is the most important surface in the entire system, because it is how the paying user's business gets done. We design with both audiences in mind at all times.

---

## 1. The Primary Persona — Lucy Martinez

Lucy is an office assistant at Reds Construction. She is not technical. She uses Gmail, Google Calendar, Slack casually, and she was the person who set up Reds' Squarespace site two years ago because nobody else would. She is resourceful and impatient with tools that waste her time. When her boss says "we need a page for the small jobs division where people can request a quote," she wants to handle it in the next twenty minutes, not the next two afternoons. She does not care what framework is under the hood. She cares that the page matches Reds' brand colors, that the form captures the right information, that she gets an email when someone submits, that the booking shows up on her calendar if it's a scheduled thing, and that the link she pastes into the Reds website works on mobile.

Lucy will come back to Forge repeatedly because her job produces a steady trickle of one-off page needs: a holiday promo for a mini-session, a proposal for a corporate client, an event RSVP for the company picnic, a daily menu for the break room, a gallery link for a photo shoot. Each of these is a small page. Forge is the tool for small pages.

---

## 2. Core User Flows

Each flow below is numbered. The flow name is what the user would call it, not what engineering would call it. Every step has a "what the user does" line and a "what the system does" line, because the gap between those two is where most products fail.

### Flow 1 — First-Run Onboarding

**What Lucy is trying to accomplish:** Get into Forge for the first time and understand what it does well enough to start building.

1. Lucy lands on the marketing page, reads three sentences, and clicks "Start building." *System opens the signup modal, not a whole new page — context stays warm.*
2. Lucy signs up with Google or with email. *System creates a User row and an Organization row (her personal workspace), links them with a Membership row at Owner role, sets up a 14-day Pro trial with no credit card.*
3. Lucy sees a one-screen onboarding wizard with three fields: workspace name, brand primary color (optional), brand logo upload (optional). *System saves these as BrandKit on the Organization; they are applied automatically to every page she builds.*
4. Lucy clicks "Let's build something." *System lands her on Studio in empty-state, with her name in the greeting and the six suggestion chips pre-loaded (Booking form, Contact form, Event RSVP, Daily menu, Proposal, Surprise me).*

**Success criteria:** Lucy is in Studio, looking at a pulsing input field, within 90 seconds of clicking "Start building."

**Edge cases:**
- She skips brand kit setup entirely → system just uses a neutral default palette and lets her set brand later from Settings. No blocking.
- She uses Google SSO but her Google account has no profile photo → system generates an initialed avatar from her name.
- She tries to create a workspace with a name that collides with an existing slug → system appends a suffix silently, shows the final slug in Settings.

---

### Flow 2 — Create a Page From a Prompt (The Happy Path)

**What Lucy is trying to accomplish:** Describe a page in plain English and get back a working page.

1. In Studio empty-state, Lucy types: *"I need a small jobs booking page for Reds Construction with a contact form that asks for name, phone, email, job description, and 1-2 photo uploads. Use the Reds brand colors — red and black."* *System captures the prompt, shows a subtle "thinking" indicator in the bottom input, and starts the generation pipeline.*
2. The left sidebar collapses automatically. The Studio splits into a left chat feed (dark, Claude-style) and a right preview pane (light, a browser chrome with a loading skeleton inside). *System routes the prompt through the AI orchestration layer: (a) the Intent Parser extracts structured data — page type "booking-form", fields, brand colors, tone; (b) the Page Composer builds an HTML page from the component library, injecting brand tokens; (c) the system streams the HTML back via SSE so the preview fills in progressively.*
3. Lucy watches the preview come alive in roughly 8-12 seconds. A small card appears in the chat feed: *"Built your Reds Construction small jobs page"* with three action buttons — Open, Save, Email. *System has saved a draft Page row linked to her Organization, created a Form schema with the five fields, and assigned a temporary slug.*
4. Below the card, a row of "refine" chips appears: *Make it more minimal · Dark color scheme · Add pricing · Add a phone number CTA · Use bigger hero image.* *System keeps the session open so subsequent messages continue to refine this same page, not spawn new ones.*
5. Lucy types: *"Make the hero a bit more serious, this is construction not a photography site."* *System runs a section-targeted edit — only the hero section of the generated HTML is sent to the LLM along with the user's instruction, not the whole page. Token cost is low. Preview updates in ~3-5 seconds.*
6. Lucy is happy. She clicks "Publish" in the preview chrome. *System prompts for a slug (pre-filled from page type + workspace), confirms, marks the page Live, assigns the final URL `https://reds-construction.forge.app/small-jobs`, and shows a toast "Page is live."*

**Success criteria:** Lucy goes from empty Studio to a live, shareable URL in under five minutes.

**Edge cases:**
- Lucy's prompt is ambiguous ("I need a thing for customers") → system does not ask a chain of clarifying questions; it makes a best-guess page and invites her to refine with the chips. Clarifying questions are a friction trap.
- The LLM returns malformed HTML → system catches it at the Page Composer validation step, retries once with a stricter prompt, and if that fails, falls back to a template-based page matching the detected intent rather than showing an error.
- Lucy closes the tab mid-generation → system persists the draft at each chunk boundary so she can resume.

---

### Flow 3 — Section-Targeted Editing (The Magic Moment)

**What Lucy is trying to accomplish:** Change one specific part of the page without rewriting the whole thing.

1. Lucy hovers over the preview with Edit Mode on (a toggle in the preview chrome). *System overlays a dashed outline on whichever section her cursor is in — hero, main content, features, CTA, footer.*
2. She clicks the hero. *System opens a small floating prompt popup anchored to the section, with a text input pre-focused and three quick-action chips: "Shorter copy" · "Bolder headline" · "Add a background image."*
3. She types: *"Change the headline to 'Small Jobs, Done Right' and make the subtext warmer."* *System sends only the hero section's HTML + the user's instruction to the fast model (Claude Haiku / GPT-4o-mini by default), receives a patched section, validates it, splices it back into the live HTML, and updates the preview. No other section is touched.*
4. The preview updates inline with a subtle crossfade animation on just that section. *System records this edit as a PageRevision row tied to the section, so undo works.*

**Success criteria:** Section edits complete in under 3 seconds and feel reliable — the rest of the page never changes unexpectedly.

**Edge cases:**
- Lucy clicks on a section, starts typing, then clicks elsewhere without submitting → system dismisses the popup and treats the edit as cancelled, no save.
- She asks for something that changes the page structure beyond the section ("move the hero below the form") → system detects the cross-section intent and escalates to a full-page edit with a gentle confirmation: "This will reorganize the page — continue?"
- She clicks Undo → system restores the previous PageRevision, updating preview.

---

### Flow 4 — Submission Arrives at a Live Page

**What the end customer (not Lucy) is trying to accomplish:** Fill out Reds Construction's small jobs form.

1. A homeowner named Dan lands on `https://reds-construction.forge.app/small-jobs` from the Reds website. *System serves a static HTML page with inline critical CSS, a tiny vanilla JS submission handler, and no third-party bloat. Page weight target: under 80KB initial load.*
2. Dan fills in the fields — name, phone, email, job description ("kitchen sink install") — and uploads two photos from his phone. *System validates on the client for obvious problems (missing required, bad email format), accepts the files into a presigned S3/MinIO upload, and on submit posts the form payload + uploaded file URLs to `/api/submissions`.*
3. Dan sees a branded "Thanks, we'll be in touch" confirmation screen with Reds' red accent and logo. *System records a Submission row (tenant-scoped), tracks the submission event in Analytics, kicks off the automation pipeline.*
4. Meanwhile, three things happen in parallel: (a) an email goes to Lucy's work email with the submission summary and a link to view it in Forge; (b) an email goes to Dan confirming receipt with a branded template; (c) if Lucy has connected her Google Calendar and enabled auto-event, a tentative event is created. *System uses Resend for both emails and the Google Calendar API for the calendar insert. All three steps are idempotent — if any fails, a retryable job is queued in Redis so we never lose a notification.*

**Success criteria:** Dan gets a confirmation screen in under 1.5 seconds of submitting. Lucy's email arrives within 10 seconds. The Submission is visible in her Forge admin within 5 seconds.

**Edge cases:**
- The upload succeeds but the POST fails (network drop) → client retries the POST with exponential backoff, showing a subtle "Submitting..." state. File uploads already completed are not re-uploaded.
- Dan uploads a 50MB photo → client compresses to a max dimension (2048px) before upload, enforces a 10MB post-compression cap.
- Lucy's email domain is bouncing → system marks the notification as failed, surfaces it in her admin dashboard with a "reconnect notifications" prompt. The submission is still saved.

---

### Flow 5 — Lucy Manages Submissions

**What Lucy is trying to accomplish:** See who submitted what, respond, mark read.

1. Lucy opens Forge. The Dashboard shows her pages with a small unread-count badge on Small Jobs. *System aggregates unread submission counts per page via a cached count stored in Redis.*
2. She clicks into the Small Jobs page. The Page Detail view has four tabs: Overview · Submissions (3) · Automations · Analytics. *System loads these tabs lazily — only Overview by default.*
3. She clicks Submissions. A table appears with three rows — Dan's, plus two earlier ones. Each row shows name, date, a status dot (new/read/replied), and an expand arrow. *System returns a paginated list of Submission rows, ordered by newest first.*
4. She clicks Dan's row. It expands inline to show all his answers, the uploaded photos (thumbnailed), and action buttons: Reply · Mark Read · Archive · Download. *System does not navigate away — inline expansion keeps her in the table.*
5. She clicks Reply. A compose-message modal opens with a pre-filled draft: "Hi Dan, thanks for reaching out about your kitchen sink install. We can come out Tuesday or Wednesday — which works?" *System uses the fast LLM to generate the reply draft from the submission context; Lucy can edit before sending. The reply goes out via Resend, is logged as a SubmissionReply row, and the submission status moves to "replied."*

**Success criteria:** Lucy can review and respond to a submission in under 60 seconds, without leaving the page.

**Edge cases:**
- She wants to export all submissions as CSV → "Export CSV" button above the table triggers a streamed download.
- She wants to search — free text search across submission fields is available above the table.
- A submission has 8+ fields and the inline expand gets tall → expansion shows up to 6 fields with "show all" control.

---

### Flow 6 — Lucy Wires Up Email + Calendar Automations

**What Lucy is trying to accomplish:** Set it once so submissions automatically email her team and land on her calendar.

1. In Page Detail → Automations tab, Lucy sees three toggles. *System loads the current automation configuration for this page.*
2. **"Notify on submission"** — toggle is on by default; email is pre-filled with her workspace email. She adds her boss's email too. *System stores up to 5 notification emails per page.*
3. **"Send confirmation to submitter"** — toggle is on; the default confirmation text is editable with a preview pane. She tweaks the text to say "Reds Construction will reach out within 24 hours." *System saves the template as EmailTemplate tied to the page.*
4. **"Calendar sync"** — she clicks "Connect Google Calendar." *System initiates OAuth, returns with tokens stored encrypted, shows her available calendars in a dropdown. She picks "Work."*
5. Below the calendar connection, a sub-toggle appears: "Auto-create event when form is submitted." She turns it on. A small duration selector appears (1h / 2h / 4h / Custom) and a "send invite to client" toggle. *System stores this as an AutomationRule; when a submission arrives, the Automation Engine fires these in order: notify → confirm → create calendar event → invite.*

**Success criteria:** Lucy completes all three automations in under 2 minutes, including Google OAuth.

**Edge cases:**
- Google OAuth is denied → system shows an inline error explaining what permissions are needed and offers "try again."
- The automation engine fails to create the calendar event (e.g., OAuth token expired) → system retries with token refresh, and if still failing, alerts Lucy in the Dashboard with a one-click reconnect.
- Lucy wants the calendar event to be tentative, not confirmed → advanced option under Custom.

---

### Flow 7 — Lucy Uses Forge for a Proposal (Second Use Case)

**What Lucy is trying to accomplish:** Send a branded one-page proposal to a prospective client and know when they read it.

1. She opens Studio. In the chat input she types: *"A one-page sales proposal for a $8,400 bathroom remodel for the Johnsons. Include scope, timeline, payment schedule, and an accept/decline button."* *System recognizes "proposal" as a page type, generates a layout with a cover, scope section, timeline section, price breakdown, and a prominent accept/decline CTA. Brand kit is auto-applied.*
2. She refines: *"Add a signature block at the bottom and make the scope a numbered list."* *System does a section-targeted edit on the scope section and appends a signature block.*
3. She publishes at `/proposals/johnson-bathroom`. *System generates a unique, unguessable slug for proposals (security-relevant — you don't want one prospect guessing another's URL).*
4. She copies the link and sends it in an email outside Forge. *System has set up this page's analytics to track: page view, section scroll depth, accept click, decline click, time on page.*
5. Two days later she checks Page Detail → Analytics. *System shows: "Opened 4 times, average view 3m12s, scrolled to timeline, clicked Accept."* A submission has also been recorded (the Accept click captures the submitter's signature text field). *System fires the same automation pipeline — email notification, calendar event for the start date, confirmation email to the client.*

**Success criteria:** Proposals feel different from booking forms — proposal pages have specific analytics (scroll depth, CTA interaction) not general counts.

**Edge cases:**
- The client shares the link → analytics correctly distinguishes unique visitors via a cookie, but proposal-specific analytics intentionally aggregate by page not by visitor (Lucy cares about "was it read," not "by whom among many readers").
- The Accept button is clicked without filling the required signature → client-side validation prevents submit, inline error.

---

### Flow 8 — Lucy Edits an Existing Page Weeks Later

**What Lucy is trying to accomplish:** Come back to a page she built, make a small change, publish.

1. She opens Forge. Dashboard shows Small Jobs with "Live · 12 submissions." She clicks it. *System loads Page Detail, defaulting to Overview.*
2. She clicks "Edit" in the page chrome. *System opens the page back in Studio with the full context: prompt history, brand kit, current HTML, current form schema. Studio is in split-screen mode from the jump because there's already a page.*
3. She types: *"Add a field to the form asking about preferred contact time (morning/afternoon/evening)."* *System updates the Form schema AND the rendered HTML in one pass. The form schema is the source of truth for submission validation; the HTML is derived.*
4. She clicks "Publish changes." *System creates a new PageVersion, keeps the old URL, migrates the submissions table to understand the new field (new field defaults to null for historical submissions).*

**Success criteria:** Edits to an existing page preserve submission history and never break the live URL.

**Edge cases:**
- Schema changes that would invalidate existing submissions (e.g., deleting a required field) → system warns: "12 past submissions will have missing data for this field — continue?"
- Structural changes mid-edit (e.g., she wants to convert a booking form to a proposal) → system treats this as a new page draft and asks "Replace Small Jobs, or save as a new page?"

---

### Flow 9 — Lucy Sets Up Her Brand Kit Once, Uses It Everywhere

**What Lucy is trying to accomplish:** Make every page she builds for Reds Construction automatically match Reds' look.

1. In Settings → Brand Kit, Lucy uploads the Reds logo, picks a primary color (`#B8272D`) and a secondary color (`#1C1C1C`), picks a display font from a curated list, and types a one-line brand voice note ("no-nonsense, honest, local"). *System saves these as BrandKit on the Organization.*
2. Every new page she builds reads these tokens and applies them in the Page Composer stage. *System injects the brand kit as CSS custom properties at the top of every generated page and includes the brand voice note in the LLM system prompt so the copy style matches.*
3. She updates the primary color three months later. *System updates the BrandKit but does NOT retroactively rebuild live pages — she must open and republish each one. (This is a deliberate choice — no surprise visual changes on live pages.)*

**Success criteria:** Brand consistency across all of Lucy's Forge pages without her thinking about it.

---

### Flow 10 — Lucy Invites Her Boss as a Viewer

**What Lucy is trying to accomplish:** Let Red (the owner) see analytics and submissions without giving him edit access.

1. In Settings → Team, she clicks "Invite" and types `red@redsrrc.com` with role Viewer. *System sends an invite email via Resend with a one-time token.*
2. Red clicks the invite, signs up, and is dropped into the Reds Construction workspace at Viewer role. *System enforces RBAC at the API layer: GET endpoints allowed, POST/PATCH/DELETE rejected with 403.*

**Success criteria:** Team roles are enforced on the server, not just hidden in the UI.

---

### Flow 11 — Lucy Uses a Template (Post-MVP Launch Feature)

**What Lucy is trying to accomplish:** Skip describing a page and start from something proven.

1. In Studio, next to the input, she clicks "Browse templates." *System shows a searchable gallery of 20-40 curated templates grouped by category: Forms, Events, Menus, Proposals, Promos, Galleries.*
2. She picks "Contractor Small Jobs Form." *System clones the template into a new Page draft in her workspace, applies her brand kit, and drops her in Studio with the page already rendered.*
3. From there she refines with chat and section edits like any other page. *Templates are just pre-generated pages with metadata; they follow the same edit paths.*

---

## 3. Secondary Flows (Not the Main Story, But Real)

- **Billing:** Upgrade from trial to Pro, downgrade to Starter, cancel subscription (must keep pages live for 30 days as a courtesy before freeze).
- **Custom domain:** Lucy can point a `forms.redsrrc.com` subdomain at Forge via a CNAME. System provisions an SSL cert automatically via Caddy or Let's Encrypt.
- **Export:** Download page as static HTML (zip with assets) for off-platform hosting.
- **Delete account:** Full tenant data removal within 30 days as per GDPR; immediate pause of all live pages.
- **Incognito preview:** Lucy can view her live page as an anonymous visitor without triggering analytics.

---

## 4. Non-Negotiable Principles Extracted From the Conversation

These principles came out of the design iteration and bind every decision downstream.

**No fake metrics.** If we don't have data, we show the empty state. No "average 10s build" or "98% used as-is" fabrications.

**No redundant chrome.** The Studio input is the Studio. No "Studio / Describe your page and watch it build" header above an obviously-a-text-input text input. Labels do the labeling.

**No double navigation.** One primary nav per surface. Settings uses a horizontal tab strip, not a nested sidebar.

**Collapse and uncollapse should feel like part of the app, not a feature.** Sidebar state persists, transitions with cubic-bezier easing, collapsed state shows icons with hover tooltips.

**Section-click editing is the headline interaction.** Hover → outline; click → prompt; edit in place without disturbing surrounding content.

**Previews must be openable in a new tab, at any time.** Every preview has an "Open in new tab" affordance. Uses a real URL, not a blob.

**The app should feel light and fun, not enterprise-heavy.** Warm palette, subtle motion, toasts for confirmations, spring animations on success states. But never cute to the point of getting in the way.

**Anticipate Lucy's needs.** After building a page with a form, proactively ask for the notification email rather than making her hunt in Settings. Proactive > reactive.

**The generated page is the product.** Loading speed, mobile responsiveness, form validation, submission reliability on the live page matter more than any in-Forge chrome.

**Multi-tenant from day one.** Data isolation is not a feature we add later; it's the shape of the database from the first migration.

---

## 5. Entity List Extracted From Flows

Every flow references data. Here is the master entity list the database must support. Full schema is in the API Contracts document.

- **User** — a human with an email, login creds, optional profile info
- **Organization** — a tenant; the unit of billing, brand kit, team
- **Membership** — links User ↔ Organization with a Role (Owner / Editor / Viewer)
- **Invitation** — pending Membership awaiting acceptance
- **Subscription** — Stripe subscription state for an Organization
- **BrandKit** — colors, logo, fonts, voice note; one per Organization
- **Page** — a generated page; has slug, status (draft/live/archived), type, current HTML, form schema, brand kit snapshot
- **PageVersion** — immutable snapshot of a Page at publish time
- **PageRevision** — in-session edit history (for undo)
- **Submission** — one row per form submission on a live Page, with payload JSONB
- **SubmissionFile** — uploaded file linked to a Submission
- **SubmissionReply** — reply sent to the submitter
- **AutomationRule** — the wiring of notify/confirm/calendar per Page
- **EmailTemplate** — the confirmation / reply email body per Page
- **CalendarConnection** — OAuth-linked calendar per User (Google or Apple)
- **AnalyticsEvent** — append-only event log (page views, section dwell, CTA clicks, submissions) — PARTITIONED by month
- **Conversation** — the Studio chat history tied to a Page
- **Message** — a single Studio chat message (user or assistant)
- **Template** — curated starter page (global, not per-tenant)
- **ApiKey** — optional, Post-MVP; for programmatic integrations

---

## 6. What Agents Should Build First (Order of Operations)

The flows above are not sequenced randomly. If the agent implements them in this order, each milestone is a shippable product:

1. Flow 1 + 2 → users can sign up and generate their first page. This alone is demo-able.
2. Flow 4 → live pages actually accept submissions. Now it's a real tool.
3. Flow 5 → users can see submissions. Now it has recurring value.
4. Flow 6 → automations wire the loop. Now users keep coming back.
5. Flow 3 → section editing. Now it feels magical.
6. Flow 7 + 8 → multiple page types, edit-over-time. Now it's a platform.
7. Flow 9 + 10 → brand kit and teams. Now it's for organizations, not just individuals.
8. Flow 11 → templates. Now it scales to less-technical users.

This ordering is the recommended mission sequence for implementation.

---

## Repo tracking (living)

Implementation progress against these flows: **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** (PRD checklist + mission notes) and **[ui/FRONTEND_STATUS.md](./ui/FRONTEND_STATUS.md)** (UI missions). This document is **normative** for product behavior; the status files describe what the codebase has shipped so far.
