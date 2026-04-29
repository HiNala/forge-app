# Forge V2 — Mini-App Platform Missions

Ten missions that take Forge from the v1 page-builder positioning into the v2 mini-app platform: a unified design canvas for forms, landing pages, proposals, decks, mobile app screens, and web pages, with brand-aware AI orchestration, predictable Free/Pro/Max pricing, region-scoped editing, clean handoff exports, and the polish to feel like a serious product.

- **[V2-P01 — Strategic Reframe](./V2_P01_STRATEGIC_REFRAME.md)** — Positioning shift from "AI page builder" to "mini-app platform." Marketing site, in-app copy, onboarding, email templates rewritten for one consistent voice. Brian's "stop straddling" feedback addressed top-down.
- **[V2-P02 — Mobile App Canvas](./V2_P02_MOBILE_APP_CANVAS.md)** — Phone-shaped design surface where users prompt one or more screens into existence, click + marquee-select any region to refine specifically that area (the paint-program-style selection box Brian asked for), and export to React Native (Expo) or Figma layers.
- **[V2-P03 — Web Canvas](./V2_P03_WEB_CANVAS.md)** — Desktop browser-frame canvas with tablet + mobile responsive previews. Multi-page websites with routing. Same region-scoped refinement UX as mobile. Exports to Next.js / static HTML / Framer-style hosted, or to Figma.
- **[V2-P04 — Pricing, Credits & Rate-Limit UX](./V2_P04_PRICING_CREDITS_RATE_LIMITS.md)** — Three tiers (Free / Pro / Max) modeled on Anthropic Claude's pricing. Session-based credit accounting with weekly caps. The Claude-style horizontal percentage-bar usage UX. Marketing pricing page. Admin can swap providers (OpenAI / Gemini / future Anthropic) without users seeing it.
- **[V2-P05 — Canvas-Aware Orchestration](./V2_P05_CANVAS_ORCHESTRATION.md)** — Upgraded orchestration brain: handles single forms, multi-page sites, mobile flows, region-scoped refines under one unified pipeline. Multi-modal (uploaded screenshots, brand reference images, PDFs as context). Admin-toggleable provider with user abstracted away.
- **[V2-P06 — Template Suite Expansion](./V2_P06_TEMPLATE_SUITE.md)** — Workflows beyond the original three (contact form, proposal, deck): event RSVP, menu, link hub, coming-soon page, gallery, promotion, survey. Curated template gallery with per-workflow categories.
- **[V2-P07 — Handoff Exports](./V2_P07_HANDOFF_EXPORTS.md)** — Every workflow exports cleanly to where the user wants it: forms as embeddable widgets, designs as Figma frames, runnable Next.js / Expo projects, decks as PPTX/PDF/Google Slides, proposals as signed PDFs, surveys as Typeform-compatible JSON.
- **[V2-P08 — Competitor Parity & New Templates](./V2_P08_COMPETITOR_PARITY_TEMPLATES.md)** — Audit against Lovable, Bolt, v0, Tally, Typeform, Carrd, Linktree, Beacons, Calendly, Mocha, Framer, etc. Build the parity features that matter (conversational form mode, conditional logic, payment fields, Figma import, MCP server, custom CSS, embed widgets), skip the ones that don't fit, ship ten new templates targeting unmet user needs.
- **[V2-P09 — Claude-Quality UI/UX Polish](./V2_P09_UI_POLISH_CLAUDE_QUALITY.md)** — A focused polish pass with one taste reference: the calm, professional, approachable feel of Anthropic's Claude.ai. Tighten design tokens, restrain motion, fix nesting, build the unified `UsageBar` component, polish dark mode, walk every surface twice. Forge feels professional and fun, clear and obvious.
- **[V2-P10 — Catch-All](./V2_P10_CATCH_ALL.md)** — The trash compactor. TODO sweep, half-wired feature audit, undo/redo, keyboard shortcuts, defaults, internationalization foundations, real loading states, friendly 404s, email polish, audit log completeness, runbook verification. Every detail the prior missions assumed, implied, or kicked down the road.

---

## Recommended Execution Order

The dependencies inside this set:

```
V2-P01 (Strategic Reframe)
  ↓
V2-P02 (Mobile Canvas)  ←──┐
  ↓                         │
V2-P03 (Web Canvas)         │  P-04 and P-05 can run in parallel
  ↓                         │  with the canvas work once P-01 lands.
V2-P04 (Pricing & Credits)  │
  ↓                         │
V2-P05 (Canvas Orchestration)
  ↓
V2-P06 (Template Suite Expansion)
  ↓
V2-P07 (Handoff Exports)
  ↓
V2-P08 (Competitor Parity & Templates)
  ↓
V2-P09 (Claude-Quality UI Polish)
  ↓
V2-P10 (Catch-All)
  ↓
[FINAL_SMOKE_TEST_POLISH from the parent folder, then GL-01 → GL-04 to ship.]
```

V2-P09 (UI polish) and V2-P10 (catch-all) are the last steps before the final smoke-test mission. Polish happens after every other surface has been built; catch-all happens after polish so we sweep up anything polish surfaced.

---

## How This Set Addresses Brian's Core V2 Asks

> **"Have a platform where you can rapidly make forms, prototypes, designs, proposals and decks and stuff and send them to people with a quick link and have easy full analytics and never have to deal with a database or anything."**
> → V2-P01 makes that the explicit positioning. V2-P02 + V2-P03 add the canvas surfaces (mobile, web). V2-P06 + V2-P08 add the template breadth. The existing W-01/W-02/W-03 + GL-01 already cover form/proposal/deck creation, public-page hosting, and analytics.

> **"Click on an area on their design and maybe like highlight with a box like in the paint program or something and be able to prompt specific areas and components."**
> → V2-P02 (mobile canvas) and V2-P03 (web canvas) include the marquee/region-select UX with prompt-scoped-to-region refinement.

> **"More capable AI orchestration layer."**
> → V2-P05 explicitly builds on top of O-01–O-04 to handle the broader workflow set, multi-modal context, and region-scoped operations.

> **"Better system for tracking credits and tokens, pricing scheme that makes sense, Claude-like percentage bar style rate limit design, free pro and max tier."**
> → V2-P04 in full. The `UsageBar` component is built once and reused across the product per V2-P09.

> **"Rebrand the marketing pages to reflect that this is a mini app builder design tool."**
> → V2-P01 rewrites the marketing positioning. V2-P09 polishes the visual presentation. V2-P08 adds the Compare pages that explain Forge's category clearly.

> **"Test with OpenAI and probably use Gemini in production... admin not user, user should be abstracted."**
> → V2-P04 + V2-P05 wire the admin-controlled provider switch. The user never sees provider choice; admin can swap without disrupting users.

> **"One mission should just be to go through review and polish and make our UI/UX as good as Anthropic Claude looks from the screenshots — but don't copy them, just I like the simplistic style they have."**
> → V2-P09 is exactly that. The mission's discipline is "principles, not pixels" — Forge keeps its own brand and color palette, but adopts Claude's principles around restraint, whitespace, calm motion, honest progress indicators.

> **"Polish and handle anything that may not be in scope of the missions."**
> → V2-P10 is the explicit catch-all for everything the rest of the missions assumed but didn't quite finish.

---

## What "Done" Means For The V2 Set

After V2-P10 completes, Forge:
- Is positioned crisply as a mini-app platform; nobody asks "wait, what is this?"
- Has the mobile and web design canvases that compete with v0 and Galileo on capability while beating them on the AI partnership feel.
- Has Free / Pro / Max pricing with predictable, honest usage UX that never feels punitive.
- Has clear competitive positioning against Tally, Carrd, Linktree, Calendly, Typeform, etc., with feature parity where it matters and intentional skips where it doesn't.
- Has a coherent visual identity that feels professional and approachable, like the reference Brian named.
- Has zero half-wired features, zero broken redirects, zero documentation pointing at nonexistent runbooks.
- Is ready for the FINAL_SMOKE_TEST_POLISH walkthrough and the GL-01 → GL-04 launch sequence.
