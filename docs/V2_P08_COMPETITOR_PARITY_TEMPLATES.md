# V2 MISSION P-08 — Competitor Parity & The Ten Templates Forge Doesn't Have Yet

**Goal:** Audit Forge against every meaningful competitor — Lovable, Bolt, v0, Mocha, Replit Agent, Tally, Typeform, Carrd, Linktree, Beacons, Calendly, Galileo AI, Framer — and close the gaps that matter. Some gaps Forge will deliberately *not* close (Forge is not a code IDE; we don't compete with Cursor). Other gaps are "we already do this but the user can't tell" — those become marketing fixes. The remaining gaps are real features that prospective users will check for and bounce if missing. This mission identifies, prioritizes, and ships the small set of competitor-table-stakes features that aren't yet in Forge, plus ten high-value templates that fill the most-asked-for use cases the existing template suite (V2-P06) doesn't already cover. After this mission, when a user comes from "I was using Tally / Linktree / Carrd / Calendly," they find what they expect within five minutes.

**Branch:** `mission-v2-p08-competitor-parity-templates`
**Prerequisites:** V2 P-01 through P-07 complete. Forge has the strategic reframe, mobile + web canvases, pricing tiers, canvas-aware orchestration, the existing template suite, and export pipelines. This mission fills the remaining holes.
**Estimated scope:** Medium. Most of the work is template authoring (each template is real work — components, default content, brand-adaptive rendering, preview screenshots) and a small number of feature additions targeted at specific competitor-parity gaps.

---

## Experts Consulted On This Mission

- **April Dunford (Obviously Awesome)** — *Position against the alternative the user would actually use, not the obvious incumbent. The competitor that matters is the tool the user would default to if Forge didn't exist.*
- **Geoffrey Moore** — *Whole-product thinking. A competitor's checklist features matter when their absence breaks the buyer's mental model of "this category does X."*
- **Jakob Nielsen** — *Where competitors have set conventions (Calendly's slot picker, Typeform's one-question-at-a-time mode), users expect those conventions. Don't fight them; absorb them.*
- **Dieter Rams** — *Adding features is easy. Adding the right ones is hard. Cut anything that doesn't earn its weight.*

---

## How To Run This Mission

The discipline is **honest competitive auditing**, not feature envy. For each competitor, list what they do well, what their users specifically come to them for, and what Forge needs to match (or deliberately not match). The output is a triage:
- **Match:** competitor-parity features Forge will build.
- **Reframe:** features Forge already has but the user can't find — fix the surface, not the substance.
- **Skip:** features that don't fit Forge's positioning. Document why so we don't revisit.

Templates are the second half of the mission. Forge ships with the V2-P06 starter library; this mission adds ten more that target common workflows the existing set misses, sourced from analyzing the most-used Tally and Typeform templates plus competitive analysis of Carrd and Beacons template galleries.

Commit on milestones: competitive audit document, prioritized parity list, parity features built, ten new templates authored, marketing collateral updated, mission report.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Competitive Audit Document

1. Create `docs/strategy/COMPETITIVE_AUDIT_2026.md`. Walk one competitor at a time. For each, document:
    - **What they're for** (one sentence).
    - **Who uses them** (the actual user, not the marketing persona).
    - **Top 5 features users specifically come to them for** (sourced from G2 reviews, ProductHunt comments, Reddit threads — not the marketing site).
    - **What Forge currently has** that matches.
    - **What Forge is missing** that matters.
    - **What Forge has that they don't** (so marketing can wield it).
2. Audit these competitors:
    - **Lovable** — full-stack code generation, Supabase integration, Visual Edits (click-to-modify on the live preview), Chat + Code modes, GitHub sync, $200M ARR scale. *Forge is not a Lovable competitor for full-stack apps; Forge competes for the "lighter, hosted, no-database" half of their use case.*
    - **Bolt.new** — browser WebContainer dev environment, multi-framework (Next, Vue, Svelte, Expo), shareable prototype links, frontend-flexible. *Same — Forge isn't competing for Bolt's developer audience, but Bolt's "shareable prototype" pattern is something we should match.*
    - **v0** — Vercel-ecosystem, shadcn-quality React components, Figma import, code handoff. *Forge needs Figma import for designers and clean React export to match v0's handoff pattern.*
    - **Mocha** — flat pricing, integrated database/auth/hosting, "no Technical Cliff" positioning. *Forge's "never touch a database" positioning aligns with Mocha; we should learn from their pricing transparency.*
    - **Replit Agent** — code-visible glass-box approach, all-in-one workspace. *Not a Forge competitor — different audience.*
    - **Tally** — generous free tier, document-style editor, Notion-like UX, MCP server for AI editing. *Tally is a direct competitor for the form workflow. Their free-tier generosity is the bar to beat for Forge's Free plan.*
    - **Typeform** — conversational one-question-at-a-time UX, brand polish, conditional logic, payment fields. *Forge needs a "conversational mode" toggle on forms to match Typeform's signature UX.*
    - **Jotform** — widget breadth, document generation, approval workflows, Card Form mode. *Forge skips most of this — Jotform is the "kitchen sink" form builder; we are the "polish in 5 minutes" form builder.*
    - **Carrd** — single-page websites, full design control, $9-49/year pricing, design-savvy users. *Forge's Web Canvas competes for Carrd's audience; we should match their "free three sites" generosity.*
    - **Linktree** — link-in-bio with monetization, Mailchimp built-in, scan-from-Instagram flow. *Forge needs a Link Hub template (covered in Phase 5). Beyond that, link-in-bio is a feature, not a workflow.*
    - **Beacons** — AI-first link-in-bio, monetization, CRM features, transaction-fee-on-free-plan model. *Beacons' AI bio writer is the kind of detail Forge should beat; our composer is more capable.*
    - **Calendly** — appointment scheduling, calendar integrations, group bookings, payment collection at booking. *Forge already has booking via the W-01 contact-form-with-calendar workflow. Phase 5 includes a stand-alone "Booking Page" template that competes more directly.*
    - **Galileo AI / Stitch (Google)** — text-to-mobile-design, but mostly stuck at the "static screen" stage. *Forge's mobile canvas in V2-P02 is more capable. Mention in marketing.*
    - **Framer** — visual editor, animations, hosted, designer-friendly. *Forge's web canvas is more AI-driven; Framer is more visual-editor-driven. Different positioning, partial overlap.*
    - **Canva** — design-anything generic. *Anthropic's Claude Design partners with Canva for handoff. Forge integrates with Canva via the export pipeline (V2-P07) for the same reason.*
3. End the audit document with a one-page "Forge in the landscape" summary: a 2x2 matrix or category map showing where Forge sits, what's our durable differentiation (the unification of form + landing + design + deck under one canvas with live tracking), and which competitors we deliberately *don't* compete with.

### Phase 2 — Parity Triage

4. From the audit, extract a triage list. For each gap, decide: **Match / Reframe / Skip**, and prioritize the Match items by impact × effort.
5. The minimum viable parity matches Forge will ship in this mission:
    - **Conversational form mode (Match Typeform)** — a per-form toggle that switches the public-form rendering from "all fields visible" to "one question at a time, animated transitions, full-screen layout." Existing form schema is reused; only the rendering layer changes. Same submission backend.
    - **Form payment collection (Match Typeform/Tally Pro)** — a "Payment" field type that creates a Stripe Checkout session at submit time, gates the submission's "completed" status on payment success. For collecting deposits on bookings, charging for a download, etc.
    - **Conditional logic in forms (Match Tally / Jotform / Typeform)** — the form schema gains a `show_if` rule per field. Simple expressions: `field_x == "yes"`, `field_y > 100`, `field_z in [a, b]`. Renderer evaluates client-side.
    - **MCP server for forms (Match Tally)** — Tally exposes their forms via an MCP server so Claude/ChatGPT can edit forms via natural language. Forge does this too: an MCP server endpoint at `/api/mcp/v1` exposing Forge's read/write capabilities so the user's Claude/ChatGPT/Cursor can build forms in Forge from another tool. **Big differentiator** — most competitors don't have this yet.
    - **Figma import (Match v0)** — accept a `.fig` file or a Figma-URL with API access; parse the Figma file's frames and components into Forge's ComponentTree (best-effort — Figma has many features Forge doesn't, document the limits). Lets designers transition into Forge without throwing away existing work.
    - **Custom CSS escape hatch (Match Tally Pro)** — Pro+ users can drop custom CSS scoped to their page. Frontend renders inside a sandboxed style scope to prevent CSS bleeding. For users who need pixel-level brand control we don't surface natively.
    - **Embed widget (Match Typeform / Tally embed)** — every published Forge mini-app exposes an `<iframe>` snippet AND a JS-based embed with auto-resizing. Users embed Forge forms in their existing website. Already partially in W-04; this phase polishes the embed UX (size presets, theme inheritance, lazy-load behavior).
    - **Form templates with response examples** — every form template in the gallery shows what a typical response looks like, not just the form. Sets expectations and helps users pick the right template.
6. **Skip** list (with documented rationale):
    - Building a code IDE inside Forge (Lovable/Bolt territory). Forge is the build-and-ship-mini-app platform; users who want to write code go to Cursor, then back to Forge for hosting and tracking.
    - Multi-framework code generation (Vue, Svelte, Angular). Forge's exports are React/Next + clean HTML; we're not the polyglot tool.
    - Real-time multi-cursor collaborative editing. Single-writer optimistic lock from W-03 is enough for now. Revisit if usage signals demand it.
    - Linktree-grade ecommerce. Stripe checkout on a single page is enough; full ecommerce is Shopify/Beacons territory.
7. **Reframe** items — features we already have but users can't find:
    - "Forge tracks every visitor, every drop-off, every section view." Surfaces in marketing copy and the Pulse dashboard, but the analytics-as-differentiation message isn't on the homepage. Phase 7 fixes this.
    - "Forge gives you the export so you're never locked in." The export pipeline (V2-P07) is invisible on the marketing site. Phase 7 fixes.
    - "Forge has a real backend — submissions, calendars, automations — without you ever touching a database." The "never touch a database" line is in V2-P01's positioning but doesn't appear on the homepage hero. Phase 7 fixes.

### Phase 3 — Conversational Form Mode

8. Add a `display_mode` field to the form's `intent_json`: `"stacked"` (current default) or `"conversational"`. Mode is selectable in Studio's form-settings panel.
9. Implement the conversational renderer:
    - Full-viewport layout, one card per field, large type, generous whitespace.
    - Smooth transitions between cards (Framer Motion: slide+fade, 280ms, eased).
    - Progress dots at the top (or bottom on mobile).
    - Enter to submit each field; Shift+Enter for line breaks in textareas; backspace at empty field navigates to previous question.
    - "OK" button mirrors Typeform's keyboard-implied advance.
    - Validation appears inline; error states animate the current card.
    - Final card is the submit confirmation with a "Submit" CTA and any payment block if configured.
10. Renderer respects every existing form-field type (text, email, phone, textarea, select, radio, checkbox, file upload, date, time, address, slot picker, payment).
11. Conditional logic (Phase 4) compatible: skipped fields are hidden in conversational flow.
12. Accessibility: keyboard navigation respects screen reader; aria-live on transitions to announce the current question; reduced-motion users get instant transitions, no animation.
13. Mobile: full-screen, one tap to advance, swipe gestures for power users (left = previous; right = advance once valid).
14. Settings UI: a "Display mode" picker in the form-settings tab with two big preview thumbnails. Real-time preview when toggled.

### Phase 4 — Conditional Logic

15. Extend form-field schema with an optional `show_if` rule:
    ```typescript
    type ShowIf = {
      all?: ShowIfCondition[]; // AND
      any?: ShowIfCondition[]; // OR
      not?: ShowIfCondition;
    };
    type ShowIfCondition = {
      field: string;          // field id
      op: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains' | 'empty' | 'not_empty';
      value?: unknown;
    };
    ```
16. Studio surface for adding rules: click any field, click "Add condition", pick a source field + operator + value. Zero-text setup. Three rules max per field on Free, ten on Pro, unlimited on Max.
17. Renderer evaluates rules client-side on every keystroke or selection change. Skipped fields don't fire `form_field_focus` analytics events (avoids polluting funnels).
18. Backend submission validation: server re-evaluates rules with the submitted data and rejects submissions that include values for fields that should have been skipped (defense against tampered clients).
19. Studio preview: a "test mode" toggle that highlights rule-affected fields with a subtle dotted border. Click any field's border to see its rule chain.

### Phase 5 — Payment Field & Stripe Checkout

20. Add `payment` as a new field type. Configuration:
    - Amount: fixed (e.g., $50 deposit) OR variable (computed from another field, e.g., qty × price).
    - Currency: org's default currency from Settings.
    - Description shown on the Stripe Checkout page.
    - Flow: at submit, the backend creates a Stripe Checkout Session via the org's connected Stripe account, returns the URL, the frontend redirects, Stripe redirects back to a Forge "thank you" page with the Stripe `session_id`.
    - Webhook (`checkout.session.completed`) marks the submission as `payment_status='succeeded'` and triggers any post-submit automation chain (notify owner, etc.).
    - Failed/abandoned payment: submission is marked `payment_status='abandoned'` after 24h; org sees these in submissions filtered by status.
21. Stripe Connect setup: extend the `integrations` table with `provider='stripe_connect'` for the org's connected Stripe account (separate from Forge's billing Stripe account). Onboarding via `account.create` + Express onboarding flow.
22. Free plan does not have Payment fields (Stripe Connect onboarding is meaningful overhead; gate to Pro+).

### Phase 6 — MCP Server for Forge

23. Build a Model Context Protocol server at `/api/mcp/v1` exposing Forge as a tool to the user's Claude / ChatGPT / Cursor / other MCP clients. This is a strong differentiator — most competitors aren't here yet.
24. Authentication: the user generates an MCP-specific token from Settings → API Tokens (already exists from BI-04, just add a scope `mcp:full`).
25. Tools exposed via MCP:
    - `forge.list_pages` — list the user's pages with metadata.
    - `forge.create_page` — create a new page from a prompt + workflow type.
    - `forge.update_page` — apply a refine or section edit to an existing page.
    - `forge.publish_page` / `forge.unpublish_page`.
    - `forge.list_submissions` — get submissions for a page.
    - `forge.get_analytics` — get analytics for a page.
    - `forge.list_templates` / `forge.use_template`.
26. Resource references via MCP let an AI assistant in another context display Forge pages inline.
27. The MCP server runs as a sub-router of the API; uses the same auth + RLS plumbing. Fully tested in GL-03's contract suite.
28. Documentation: `docs/integrations/MCP_USAGE.md` showing how to wire up Cursor / Claude Desktop / ChatGPT to Forge's MCP server.

### Phase 7 — Figma Import

29. Add a "Import from Figma" entry point in the Studio empty state.
30. Two import paths:
    - **File upload:** user uploads a `.fig` file. Parsed via `figma-tokens` or equivalent server-side library; nodes mapped to Forge components where possible.
    - **API connect:** user authorizes a Figma read-only OAuth scope; pastes a Figma URL; Forge fetches via the Figma REST API.
31. Mapping rules (best-effort, document the limits):
    - Frames → page sections.
    - Auto-layout containers → flex/grid Forge components.
    - Text nodes → text components with the closest Tailwind type-scale match.
    - Image fills → image components, with the original asset uploaded to Forge's storage.
    - Components with variants → fall back to a single representative variant.
    - Anything Forge can't map → represented as a static image of that node, with a chip "Imported as image — click to convert."
32. Post-import Studio: the imported screen lands on the canvas with the same edit-by-region UX as a normal Forge design. The user can refine prompted regions to convert image fallbacks to live components.
33. Limits document: prototypes, animations, plugin output, complex auto-layout, code generated by Figma's Dev Mode — none of these are imported. Document explicitly.
34. Settings → Integrations → Figma — connection management.

### Phase 8 — Custom CSS Escape Hatch

35. Pro+ orgs get a "Custom CSS" panel in each page's Settings tab.
36. CSS is scoped automatically: a unique class is added to the page's root element; the user's CSS is rewritten server-side to prefix every selector with that class. Prevents bleed and protects Forge's rendering.
37. Validation: reject `@import`, reject expressions that escape the scope, reject `url()` references that aren't to allowlisted domains (the user's brand assets in Forge storage).
38. Live preview: the Studio preview shows the custom CSS applied; toggle to compare with/without.
39. CSS persisted with the page revision so reverts include CSS state.

### Phase 9 — Embed Widget Polish

40. Every published page exposes embed snippets in the Share dialog:
    - **iframe** (simple): `<iframe src="https://forge.app/p/{slug}/embed" width="100%" height="600" frameborder="0"></iframe>`. Auto-resize via `postMessage` to the parent.
    - **JS embed** (advanced): a `<script>` tag that injects the iframe and handles size updates. Theme-inherits via prefers-color-scheme detection.
    - **WordPress / Webflow / Squarespace one-click instructions:** copy-paste guides for the three most common host platforms, scoped to each workflow type.
41. Embed has a `data-forge-embed-mode="conversational"` attribute that switches form rendering inline.
42. CORS: embed origin can be restricted to the user's domains via Settings → Custom Domains. Defaults to `*` (any origin) for ease of use; users can lock down.

### Phase 10 — The Ten New Templates

43. Author ten new templates that fill the most-asked-for use-case gaps. Each template includes: realistic placeholder content, brand-adaptive rendering (uses the org's brand kit on use), preview screenshot, category and search tags, recommended-for-you flag based on workflow.
44. **Template 1: Beta Waitlist Page** — landing page with a single email-capture field, social-proof counter ("412 already signed up"), what-to-expect timeline, founder note section. Replaces the dozens of "I just need a quick waitlist" Carrd setups.
45. **Template 2: Course / Workshop Sign-Up** — form with date picker, attendee count, dietary preferences, payment field (deposit). Confirmation email with calendar invite. Replaces Calendly + a Stripe payment link.
46. **Template 3: Event RSVP with Plus-Ones** — form with yes/no, plus-one toggle, names, dietary, transport needs. Group view in Submissions tab. Replaces Partiful for casual hosts who don't want yet another app.
47. **Template 4: Customer Feedback Survey (NPS + Open)** — Net Promoter Score selector + one open-ended question + optional contact info. NPS computation in Analytics tab. Replaces SurveyMonkey for the "I just want NPS" job.
48. **Template 5: Job Application Form** — name, email, phone, resume upload, portfolio URL, role applying for (select), short answer "why us" textarea, optional video link. Replaces Greenhouse-lite for solo founders hiring their first hires.
49. **Template 6: Coaching/Consulting Discovery Call Page** — contact form + slot picker (W-01 calendar) + "tell me about your situation" textarea + "what you'll get out of this call" benefit list. Replaces Calendly + a long-form Typeform combo.
50. **Template 7: Restaurant / Service Menu** — page with menu sections, item cards (photo + name + description + price), allergen tags, "Order via [phone | email | external link]" CTA. Replaces a static Squarespace menu page or a printed PDF.
51. **Template 8: Link Hub (Linktree alternative)** — bio at top, a vertical list of link cards each with an emoji icon, a centered "join newsletter" embed midway down, social-icon row at the bottom. Multiple themes. Replaces Linktree/Beacons.
52. **Template 9: Personal Coming-Soon Page** — single-page hero with name, headline, "I'm currently building [X]" subhead, three "what I'm working on" links, an email signup. Replaces a Carrd one-pager.
53. **Template 10: Quote Request Form (Service Businesses)** — multi-step form with project type, scope checkboxes, timeline urgency, budget range, contact info. Server-side: triggers an internal scoring rule that flags high-priority leads. Replaces a contractor's "request a quote" form on their WordPress site.
54. Each template is generated by running the org's chosen workflow composer (V2-P05 orchestration) with a curated prompt + reference data, then hand-polished by the team. Output: a ready-to-clone template entry in the `templates` table seeded by the migration.
55. Each template's preview is a real Forge page (with `is_template_preview=true`) that loads at `/p/templates/{slug}` for visitors and from the in-app gallery.
56. Add template categories to the Templates browse page: Lead Capture · Booking & Scheduling · Events · Surveys · Personal · Sales · Restaurants & Menus · Service Businesses · Coming Soon · Link Hub. Each category has a one-line description.

### Phase 11 — Marketing Updates From The Audit

57. Apply the "Reframe" findings from Phase 2:
    - Hero subheadline gains a line: "Built-in tracking. Real submissions inbox. Never touch a database."
    - A new section under the hero shows three differentiation cards:
        - **"Your data, not theirs"** — every Forge mini-app stores its own submissions, exposes its own analytics, no third-party tool to set up.
        - **"Take it with you"** — every workflow exports to clean code, Figma, or PDF. Pull-quote: "Want to switch later? You're not locked in."
        - **"AI you actually want to use"** — a single-line summary of the orchestration pipeline (review panel, brand-aware composer, no slop) without leaning on the AI buzzword.
58. Add a "Compare" page at `/compare` with three sub-pages: `/compare/typeform`, `/compare/carrd`, `/compare/canva`. Each is honest — what they do well, what Forge does differently, and the specific user we recommend each tool for. Honesty is more persuasive than puffery.
59. Add a "Templates" filter on the marketing templates page that surfaces "Coming from {tool}? Try this." cohort entry points.

### Phase 12 — Testing

60. Conversational form mode: Playwright tests for keyboard navigation, validation, full submission flow, mobile gestures.
61. Conditional logic: server validation rejects tampered submissions; client renderer correctly hides/shows fields on rule changes; accessibility maintained.
62. Payment field: test Stripe Connect onboarding, successful checkout, failed checkout, abandoned checkout, webhook idempotency.
63. MCP server: a contract test suite using the official MCP test client; every exposed tool is covered.
64. Figma import: 3-5 reference Figma files of varying complexity; assert each maps to a viable Forge page (allowed to be lossy, must not crash).
65. Custom CSS: malicious-input tests (try to inject `@import`, escape scope, reference external URLs) all rejected; valid CSS scoped correctly.
66. Embed: cross-origin auto-resize works; theme inheritance from `prefers-color-scheme`; CORS restrictions enforced.
67. Each new template renders correctly with default brand kit AND with three sample brand kits (warm/cool/dark). Snapshot test commits.
68. Marketing: visual regression on the new homepage hero and Compare pages.

### Phase 13 — Documentation

69. `docs/strategy/COMPETITIVE_AUDIT_2026.md` (Phase 1 output) committed.
70. `docs/integrations/MCP_USAGE.md` (Phase 6).
71. `docs/integrations/FIGMA_IMPORT.md` — what works, what doesn't.
72. `docs/templates/TEMPLATE_AUTHORING.md` — how a future contributor adds a template.
73. Mission report.

---

## Acceptance Criteria

- Competitive audit document covers 14 competitors with structured findings.
- Parity triage results in a clear Match / Reframe / Skip list with rationale.
- Conversational form mode works end-to-end, mobile and desktop.
- Conditional logic UI lets users add rules without editing JSON; server validates submissions correctly.
- Payment field with Stripe Connect onboarding works for live test.
- MCP server exposes Forge as a tool in Claude Desktop and Cursor.
- Figma import handles common file types with documented limits.
- Custom CSS is scoped, validated, and live-previewable.
- Embed widget produces working iframe and JS snippets with one-click instructions.
- Ten new templates render correctly across brand kits and appear in the gallery.
- Marketing site reflects the audit's reframe findings.
- All tests pass.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
