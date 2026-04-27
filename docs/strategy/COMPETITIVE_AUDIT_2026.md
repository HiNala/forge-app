# Competitive audit — 2026 (P-08)

This document triages **Match / Reframe / Skip** for Forge. Sources include public positioning, G2-style review themes, and common Reddit/Product Hunt complaints — synthesized honestly, not as marketing copy.

---

## Lovable

- **What they’re for:** Full-stack app generation with GitHub, Supabase, and visual code edits.
- **Who uses them:** Founders and agencies shipping “real” apps in days.
- **Top 5 draws:** end-to-end code + DB, click-to-edit on preview, chat/code modes, GitHub, scale/proof in market.
- **Forge match:** shareable public links, Studio iteration, handoff (HTML/PDF/PPTX) where shipped.
- **Missing vs them:** in-browser repo + database — **deliberate** (we are not a full IDE).
- **Forge has that they don’t:** one surface for *mini-apps* (form + page + deck + tracking) without repo ops.
- **Triage:** **Skip** direct parity on full-stack; **Reframe** “shareable prototype” via publish + live URL + export.

## Bolt.new

- **What they’re for:** In-browser dev environments and multi-framework starters.
- **Who uses them:** Prototypers and devs.
- **Top 5 draws:** WebContainer, share links, many stacks, free exploration, “run it in the tab.”
- **Match:** one URL per mini-app, preview-first.
- **Missing:** a dev container — **Skip**.
- **Triage:** **Reframe** shareable result on `/p/...`; **Match (light)** embed + conversational form polish.

## v0 (Vercel)

- **What they’re for:** High-quality React components and Figma handoff in the Vercel ecosystem.
- **Who uses them:** Frontend teams and design-led startups.
- **Top 5 draws:** shadcn quality, Figma, code export, tight Next alignment.
- **Match:** design exports in P-07, web canvas.
- **Missing:** Figma *import* into Forge (Match — Phase 5 in mission; may ship incrementally).
- **Triage:** **Match** Figma import roadmap; **Reframe** export story on `/handoff`.

## Mocha (Novelcrafter ecosystem / “no technical cliff” tools)

- **What they’re for:** Simplified shipping with minimal ops — varies by product in category.
- **Who uses them:** Non-devs who still want a “real” app.
- **Top 5 draws:** flat or simple pricing, hosting implied, no DB ceremony.
- **Match:** no database for the user; managed submissions + org.
- **Missing:** extreme pricing transparency in marketing — **Reframe** on `/pricing` + copy.
- **Triage:** **Reframe** pricing clarity; **Match** “never touch a database” on homepage (Phase 7).

## Replit Agent

- **What they’re for:** Code + agent in one workspace.
- **Who uses them:** Students and devs.
- **Triage:** **Skip** — not our buyer; document once and move on.

## Tally

- **What they’re for:** Beautiful forms, generous free usage, document-style editor.
- **Who uses them:** Indie makers and ops teams replacing Google Forms.
- **Top 5 draws:** free tier, fast editor, Notion feel, simple embeds, MCP (AI edit).
- **Match:** form workflows, HTML/embed handoff, submissions inbox.
- **Missing:** Tally-level free generosity (business decision); **Match** conversational mode + **Match** MCP surface (mission scope).
- **Triage:** **Match** conversational + conditional + MCP; **Reframe** free tier in pricing copy if policy allows.

## Typeform

- **What they’re for:** Conversational, high-polish one-question flows.
- **Who uses them:** Marketers, HR, and brand teams.
- **Top 5 draws:** one-at-a-time UX, brand, logic, pay fields, results UX.
- **Match:** P-08 conversational renderer on same schema; logic via `show_if`.
- **Missing:** feature-complete logic builder vs Typeform (scope iteratively); payments via Stripe Connect (mission).
- **Triage:** **Match** conversational + conditional + payment (when Stripe path complete).

## Jotform

- **What they’re for:** “Everything in forms” — documents, apps, payments, etc.
- **Who uses them:** Nonprofits, SMBs, and ops.
- **Top 5 draws:** massive field library, PDFs, approvals, widgets.
- **Triage:** **Skip** kitchen-sink parity; **Reframe** “polish in 5 minutes” in messaging.

## Carrd

- **What they’re for:** Single-page sites and micro-sites, design-focused.
- **Who uses them:** Design-savvy one-person projects.
- **Top 5 draws:** low price, simple editor, many templates, fast publish.
- **Match:** web canvas + one-page landings, templates in gallery.
- **Missing:** “three sites on free” style generosity — product/pricing, not this mission’s code.
- **Triage:** **Reframe** compare page `/compare/forge-vs-carrd`; **Match** template gaps via ten new templates.

## Linktree

- **What they’re for:** Link-in-bio, light monetization, social traffic.
- **Who uses them:** Creators and small brands.
- **Top 5 draws:** free tier, blocks, social icons, light CRM, “scan from IG.”
- **Match:** `link_in_bio` workflow, templates.
- **Missing:** feature parity on monetization — **Skip** full commerce; **Match** “Link hub” template.
- **Triage:** **Match** template; **Reframe** analytics + one link under Forge.

## Beacons

- **What they’re for:** AI-driven creator funnels, monetization, light CRM.
- **Who uses them:** Creators.
- **Top 5 draws:** AI copy, store blocks, lead capture, phone-first.
- **Match:** AI composer, pages, link hub-style templates.
- **Triage:** **Reframe** our composer strength; no transaction-fee model in this pass.

## Calendly

- **What they’re for:** Scheduling and team routing.
- **Who uses them:** Sales and CS orgs.
- **Top 5 draws:** round-robin, CRM, payments on booking, team calendars.
- **Match:** W-01 booking + contact workflow.
- **Missing:** Calendly-depth routing — **Skip** for v1; **Match** “discovery call” and course templates.
- **Triage:** **Reframe** on compare page; **Match** new booking-oriented templates.

## Galileo / Stitch (Google) — *text-to-screen*

- **What they’re for:** fast static-ish UI from a prompt.
- **Who uses them:** product designers experimenting.
- **Triage:** **Reframe** — Forge mobile canvas is *interactive + tracked*; mention on `/workflows/mobile-app` when refreshed.

## Framer

- **What they’re for:** Visual design + site hosting for designers.
- **Who uses them:** Design-led marketing sites.
- **Top 5 draws:** visual editor, effects, component sets, publish.
- **Triage:** **Reframe** — we are *prompt+review+canvas*, not a Framer-style timeline editor. Partial overlap in web canvas exports.

## Canva

- **What they’re for:** General design and pitch collateral.
- **Who uses them:** Everyone.
- **Top 5 draws:** template volume, media library, team plans, *pitch decks* with brand kits.
- **Triage:** **Reframe** compare for decks + export; partner story via handoff, not a Canva clone.

---

## Parity list (P-08 ships / roadmap)

| Item | Triage | Notes |
|------|--------|--------|
| Conversational form mode | **Match** | `display_mode` + public JS |
| Conditional field logic | **Match** | `show_if` + server validation |
| Form payments (Stripe) | **Match** | Ongoing; Connect + field type as mission allows |
| MCP server for Forge | **Match** | HTTP tool surface; tokens from BI-04 style scopes |
| Figma import | **Match** | Incremental; limits documented |
| Custom CSS (Pro+) | **Match** | Scoped CSS via intent or page JSON |
| Embed polish | **Match** | iframe + JS; `data-forge-embed-mode` |
| Ten net-new templates | **Match** | Seed + gallery |
| Hero “tracking + no DB + export” | **Reframe** | Marketing |
| Compare URLs | **Reframe** | Honest /compare + aliases |

**Skip (documented):** in-product IDE, Vue/Svelte/Laravel generators, real-time co-editing, full ecommerce.

---

## Forge in the landscape (summary)

|  | *More "developer / code"* | *More "hosted / no-code"* |
|--|-----------------------------|-----------------------------|
| **Heavier integration / enterprise** | Lovable, Replit, v0+Git | Typeform, Jotform, Calendly |
| **Lighter, fast ship** | Bolt prototypes | **Forge**, Carrd, Tally, Linktree |

**Durable differentiation:** one Studio for **form + page + design surfaces + deck + live analytics + handoff** without the user running infrastructure — with **honest exports** and **submissions that stay in your org**, not a third-party’s aggregate product.

**We do not compete with:** code IDEs, full CLM, or Shopify-scale commerce in 2026 — we *pair* with those categories when the user outgrows a single link.
