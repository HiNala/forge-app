# WORKFLOW MISSION W-04 — Workflow Integration Into The App Surface

**Goal:** Take the three flagship workflows (contact form with calendar, contractor proposal, pitch deck) and weave them into Forge's app surface as first-class, discoverable experiences — not three disconnected products that happen to live in the same database. After this mission, a new user seeing the Dashboard or Studio for the first time immediately understands what Forge makes for them; a returning user finds exactly the right starting point for their next page without thinking; and the product's value proposition reads coherently from marketing → signup → onboarding → Studio → dashboard → per-workflow detail.

**Branch:** `mission-w04-workflow-integration`
**Prerequisites:** W-01, W-02, W-03 all complete. Each workflow generates, renders, and processes submissions end-to-end. Frontend F01–F07 complete so the design system and all surfaces are production-grade.
**Estimated scope:** Medium. No new backend primitives — this is product integration: entry points, surface customization per workflow type, empty states, templates, cross-workflow analytics, marketing positioning.

---

## Experts Consulted On This Mission

- **Tony Fadell** — *Design the ecosystem. Each workflow has a before-and-after; are those loops designed, or did we stop at 'the page was created'?*
- **Kevin Systrom** — *How few clicks from 'I need a proposal' to 'I'm editing a proposal'? Three clicks or fewer.*
- **Jesse James Garrett** — *The product's information architecture should tell the story. Do the workflows appear in the same place a user would instinctively look?*
- **Evan Spiegel** — *Does the user feel capable here? Or are we showing off what Forge can do instead of helping them ship?*

---

## How To Run This Mission

The failure mode to avoid: three well-built workflows that feel like three separate apps. The success mode: a user whose first thought is "oh, Forge makes the page I need, whatever that is." 

Read User Case Reports flows 1, 2, 3, 7, and 11. Read the "primary persona" section — Lucy is the contact-form user, but Brian (a different persona) is the pitch-deck user, and a generic contractor is the proposal user. The same Dashboard has to serve all three without feeling cluttered for any of them.

Commit on milestones: workflow pickers, Studio empty-state redesign, templates gallery reorganized, dashboard filters, workflow-aware analytics, marketing positioning, onboarding path selection.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Studio Empty-State Workflow Picker

1. Redesign Studio's empty state (the very first surface after onboarding) to gracefully surface all three workflows without overwhelming. Layout:
    - **Central input** (unchanged): "Describe what you'd like to build…" with the warm greeting above.
    - **Below the input**, three horizontally-arranged workflow cards:
        - "Contact form" — icon, one-liner "Booking-ready forms that sync to your calendar." Clicking pre-fills the input with a starter prompt: "A contact form for my business — ".
        - "Proposal" — icon, one-liner "Professional, signable bids your clients can accept in one click." Pre-fills: "A proposal for ".
        - "Pitch deck" — icon, one-liner "Investor-ready decks built from your story." Pre-fills: "A pitch deck for ".
    - **Below those**, a smaller secondary row of suggestion chips covering remaining page types (event RSVP · menu · landing · promotion · gallery · surprise me).
    - **Browse templates** link unchanged, below.
2. Cards are NOT buttons that start generation — they prime the input, so the user still feels in control and can edit before submitting. The distinction between priming and generating matters for user confidence (Raskin: no surprise actions).
3. Subtle motion: on card hover, the card's icon does a tiny rotation/bounce (Atkinson: delight without noise).
4. If the user has previously used Studio, the empty state adapts: the workflow the user has built MOST appears first in the row, subtly highlighted. Zero state stays the designed default order.

### Phase 2 — Unified Generate Entry Point

5. Keep `POST /api/v1/studio/generate` as the single entry point regardless of workflow type. The intent parser (orchestration mission O-02) routes internally to the right composer. The frontend never has to "pick a workflow" explicitly — the prompt drives routing.
6. **However**, when the intent parser is uncertain (confidence < 0.65 on any workflow branch), the first SSE event it emits is `workflow_clarify` with `{candidates: [{workflow, confidence, rationale}], default}`. The frontend shows a compact inline prompt in the chat panel: "I'm reading this as a proposal — or did you mean a contact form with rate tables?" with one-click switches. User picks, generation proceeds.
7. The inline clarification appears as a small assistant message with two buttons. It is NEVER a blocking modal. If the user ignores it and types something else, we proceed with the default candidate (Forge's principle: give output before asking — clarification is a nicety, not a gate).

### Phase 3 — Page Type As A First-Class Surface Attribute

8. Dashboard page cards already show the page type as a chip (F-03). Extend:
    - Colors the chip by workflow family: teal for contact/form, warm orange for proposal, muted indigo for deck, neutral for others.
    - The chip's icon matches the workflow's iconography.
    - The thumbnail preview uses layout-aware rendering: proposal thumbnails show the cover hero, deck thumbnails show the title slide, contact form thumbnails show the hero + first input field. Never generic screenshots.
9. Dashboard filter chips now include quick-filters: All · Contact forms · Proposals · Decks · Other. The existing status filter (Live / Draft / Archived) sits next to it.
10. Search: when a user types something that matches a page type keyword (e.g., "proposal"), the search bar shows a synthetic suggestion "See all proposals →" as the first result.

### Phase 4 — Per-Workflow Page Detail Customization

11. The Page Detail shell (F-05) has its four tabs: Overview, Submissions, Automations, Analytics. Each workflow customizes:
    - **Contact form with booking** — Overview shows a "Today's appointments" widget; Submissions tab has a Bookings-only quick filter; Automations tab surfaces Calendar-specific controls prominently.
    - **Proposal** — Submissions tab renames to "Viewers & decisions"; adds a "Questions" sub-tab for client inline Q&A; adds a "Change orders" subtle navigation if any versions exist. The Overview's hero shows a big status banner: "Waiting for decision" / "Viewed 3 times, no decision" / "Accepted on Apr 20" with the deal value.
    - **Pitch deck** — Submissions tab renames to "Viewers" (decks rarely have form submissions unless gated); adds a "Presentations" view showing each presenter-mode session; an "Export" tab replaces Automations (since decks have export rather than automation chains).
12. These customizations are driven by a small `getWorkflowConfig(pageType)` helper in the frontend that returns tab config, hero widgets, and side-panel components. Keeps the shell DRY.
13. Page Detail's action header changes per workflow:
    - Contact/form: "Share link" + "Open in new tab".
    - Proposal: "Send to client" (opens a small modal with the client email + custom message + send button) + "Download PDF" + "Share link".
    - Deck: "Present" + "Export" (dropdown: PDF / PPTX / Google Slides) + "Share link".

### Phase 5 — Template Gallery Reorganization

14. The Templates gallery (in `(app)/templates` and the marketing `/templates` page) gets a workflow-first organization:
    - Top section: three big cards labeled "Contact forms & bookings", "Proposals & quotes", "Pitch decks & presentations". Each card is clickable — routes to a filtered view of just that workflow's templates.
    - Below: a "Browse all templates" grid with the full library, filterable by category chips as before.
15. The landing page (F-02 marketing hero) gets a workflow carousel below the hero:
    - Three showcase tiles with a 3-second auto-advance, each showing a rich preview of one workflow (the booking page, a proposal, a deck slide). User can swipe/click to pause and explore.
    - "See how it works" CTA under each tile → routes to a workflow-specific explainer sub-page.
16. Create `(marketing)/workflows/contact-form/page.tsx`, `/proposal/page.tsx`, `/pitch-deck/page.tsx`. Each is a focused landing with:
    - Hero specific to the use case ("Stop phone tag with customers. Pick-a-time booking in 3 minutes.").
    - 30-second demo video or animated GIF.
    - 2-3 testimonials from that workflow's users (real or placeholder).
    - FAQ specific to that workflow.
    - Start-free CTA that deep-links into signup with `?workflow={type}` preserved through to Studio.

### Phase 6 — Onboarding Path Selection

17. Extend the onboarding wizard (F-03) with a fourth pre-fields step that asks "What's the first thing you want to build?" with four tappable cards: Contact form / Proposal / Deck / I'll figure it out. This shapes the post-onboarding Studio landing:
    - If a workflow is picked, Studio opens with that workflow's card pre-selected and the input pre-primed with a starter prompt.
    - If the user picks "I'll figure it out", Studio opens with the full neutral empty state.
18. The choice is stored in `users.user_preferences.onboarded_for_workflow` — used later for tailoring suggestions and tutorial hints.
19. This step adds ~5 seconds to onboarding but dramatically improves the first-page success rate. Keep it optional: a small "Skip" text link under the cards.
20. The deep-link `?workflow={type}` from marketing preserves through signup → onboarding, auto-fills this step.

### Phase 7 — Cross-Workflow Analytics Dashboard

21. The org-wide `(app)/analytics` page (already built in F-06) gets a workflow breakdown section:
    - Card row at the top: "Contact forms · N pages · N submissions this month" / "Proposals · N sent · $X pipeline · N% win rate" / "Decks · N views · N presentations".
    - Each card is clickable — routes to a filtered analytics view scoped to that workflow's pages.
22. **Pipeline view** (new surface at `(app)/analytics/pipeline`): for orgs that use proposals heavily, shows a Kanban-style view of proposals by status (Draft → Sent → Viewed → Questioned → Decided). Useful for a contractor running 10+ proposals per month.
23. **Engagement view** (new at `(app)/analytics/engagement`): for orgs that use decks heavily, shows time-on-deck per viewer, export frequency, presenter sessions. Useful for a founder tracking who's reading their pitch.
24. Both views respect the org's page mix — if an org has zero proposals, the Pipeline view is hidden from the nav (not shown as an empty state). Forge's UI shouldn't advertise features the user doesn't use.

### Phase 8 — Command Palette Workflow Awareness

25. The command palette (⌘K, F-03) gains workflow shortcuts:
    - "New contact form" → opens Studio with contact form prime.
    - "New proposal" → opens Studio with proposal prime.
    - "New pitch deck" → opens Studio with deck prime.
    - "Find my proposals" → filters Dashboard to proposals.
    - "Find decks with no views" → smart search query that lands on a pre-filtered Dashboard.
26. Fuzzy matching learns from use: the commands the user runs most appear first.
27. Keyboard shortcuts for the most common actions get their own shortcuts: `Cmd+Shift+C` for new contact form, `Cmd+Shift+P` for new proposal, `Cmd+Shift+D` for new deck. Listed in the `?` cheatsheet.

### Phase 9 — Email Digest Variations Per Workflow

28. The daily/weekly digest emails (BI-04's notification center) adapt content per workflow:
    - A contact-form user gets a digest of new bookings + availability forecast ("You have 4 open slots next week").
    - A proposal user gets a pipeline summary ("2 proposals awaiting decision, 1 expires tomorrow") + revenue-at-risk.
    - A deck user gets engagement updates ("Your Series A deck was viewed 3 times this week; here's who") with a heat pulse indicator.
29. Digest composition is a service that pulls per-workflow aggregates for the org. Each workflow contributes a "section" to the digest; sections are omitted if empty. Single unified email regardless of how many workflows the org uses.

### Phase 10 — In-App Hints & Tutorials

30. Contextual hints appear once per workflow the first time a user lands on a surface:
    - First Studio submit: "✨ Watching Forge build. You can click any part of the result to edit it."
    - First Page Detail visit: "Here's where all your page's activity lives. Come back here to check submissions or share."
    - First Submissions tab open with unread items: "Click a row to expand — you can reply right here without switching tabs."
    - First proposal accepted: "Your first accepted proposal 🎉 The signed PDF is attached to the decision."
    - First deck presented: "Presenter mode is live. Arrow keys advance slides; Esc exits."
31. Hints are dismissible, tracked in `user_preferences.dismissed_hints`. Never re-show. Never block interaction (they're toasts or inline ghosts, not modals).
32. A "Show me around" option in the avatar menu that re-enables hints for the current workflow — for users who dismissed too fast.

### Phase 11 — Cross-Workflow Re-Use Patterns

33. A user who has built a contact form might also want a proposal. Surface this gently:
    - On the Page Detail's Overview for a contact-form submission that looks like a project inquiry (heuristic: submission body contains budget-language keywords, or the submitter explicitly asks for a quote), show a quiet "💡 Create a proposal for this inquiry?" CTA. Clicking opens Studio with the submission's data pre-seeded into the proposal intent (client name, email, project description).
    - This isn't a separate feature — it's the "Create from submission" action, available on every submission row in the expanded view.
34. Similarly, a deck creator might want a landing page from the deck's content. "Derive a landing page from this pitch" action on the deck's Page Detail.
35. These cross-workflow conversions are plain Studio generate calls with seeded prompts. No new orchestration needed.

### Phase 12 — Workflow Badges On Public Pages

36. Every public page (generated page served at `/p/{slug}`) includes a subtle, tasteful "Made with Forge" badge in the bottom-right corner. Only on Starter plan; Pro+ plans remove the badge automatically.
37. The badge is a small pill that:
    - Links to `forge.app/?ref=page&via={page_id_anonymized_hash}` — driving referral traffic.
    - Matches the page's visual density (smaller on dense pages, slightly larger on sparse decks).
    - Respects the page's color scheme (darkens on dark backgrounds, lightens on light).
38. "Remove Forge branding" is a Pro+ feature marketed in the pricing card; the badge's absence on a client-facing proposal is a subtle pressure to upgrade.

### Phase 13 — Sharing Surfaces

39. Every Page Detail has a "Share" button in the header. Clicking opens a Sheet (side drawer) with:
    - **Copy link** — the public URL with one-click copy.
    - **QR code** — rendered live, downloadable as PNG.
    - **Embed code** — `<iframe>` snippet for sites that want to embed the page (contact forms especially).
    - **Email invite** — an inline compose pane to send the URL with a personal note. Uses the Resend integration.
    - **Tracked share link** (Pro+) — creates a unique URL with a tracking parameter; shows who has visited via that specific link in a small table below. Useful for a contractor sending a proposal to five prospects and wanting to know who actually read it.
40. Tracked share links persist in a new `share_links` table scoped per page. Each has a label (e.g., "Sent to Johnson Family") and a visit log.

### Phase 14 — Tests & Integration

41. Test: each workflow picker card correctly pre-primes Studio and doesn't auto-submit.
42. Test: workflow clarify SSE event renders the in-chat switch UI correctly.
43. Test: Dashboard quick-filters correctly scope the page list.
44. Test: Page Detail renders the right tabs and hero widgets per workflow type.
45. Test: the "Create proposal from submission" cross-workflow action pre-seeds the right fields.
46. Test: the "Made with Forge" badge is present on Starter pages and absent on Pro.
47. Test: command palette workflow commands work, keyboard shortcuts fire.
48. Visual regression: take screenshots of Dashboard with mixed workflow pages; Page Detail for each workflow; Studio empty state; templates gallery — commit to `apps/web/design/regression/`.
49. End-to-end demo: sign up, pick "Proposal" in onboarding, Studio opens pre-primed, generate a proposal, visit Page Detail, share it — everything feels coherent.

### Phase 15 — Documentation

50. Write `docs/architecture/WORKFLOW_FRAMEWORK.md` — the pattern for adding a new workflow: intent parsing, composer agent, page-type registration, Page Detail customization, analytics hooks, templates seeding. Future workflows (menus, galleries, invoices, etc.) follow this framework.
51. Write `docs/workflows/OVERVIEW.md` — user-facing docs covering all three flagship workflows, when to use each, how they interconnect.
52. Update the marketing pages' copy with the final workflow descriptions. QA for tone consistency.
53. Mission report.

---

## Acceptance Criteria

- Studio empty state cleanly surfaces all three workflows without overwhelming.
- Intent parser routes to the right workflow; ambiguous cases trigger non-blocking clarification.
- Dashboard filters and page cards are workflow-aware.
- Page Detail customizes tabs, hero widgets, and action buttons per workflow.
- Marketing site has dedicated workflow landing pages with deep-link signup.
- Onboarding path selection preserves through to Studio.
- Command palette and keyboard shortcuts work for workflow-specific actions.
- Cross-workflow conversions (submission → proposal, deck → landing) work from their natural entry points.
- Email digests vary per workflow mix.
- "Made with Forge" badge plan-gated correctly.
- Tracked share links work for Pro+.
- All tests pass; end-to-end coherent user journey demonstrated.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
