# V2 MISSION P-01 — Strategic Reframe: From Page Builder to Mini-App Platform

**Goal:** Stop straddling. Forge has been positioned as "an AI page builder for forms, proposals, and decks" — a category that doesn't quite exist and forces us to explain ourselves on every page. This mission rewrites that positioning end-to-end. Forge becomes a **mini-app platform**: you describe what you want — a form, a landing page, a proposal, a pitch deck, a mobile app screen, a website prototype — and Forge builds it, tracks it, and hands it back to you either as a hosted mini-app with full analytics OR as a clean export you can implement elsewhere. After this mission, every marketing page, every screen of the product, every email, and every CTA reads from the same crisp positioning, and the user understands what Forge is in five seconds.

**Branch:** `mission-v2-p01-strategic-reframe`
**Prerequisites:** All prior missions complete or in progress. Existing positioning ("Forge — AI page builder for small businesses") and the marketing pages from F-02 are operational.
**Estimated scope:** Medium. Not much new code, but every page of the marketing site, the onboarding copy, the empty states, the product names, and the email templates get rewritten. The discipline is consistency, not invention.

---

## Experts Consulted On This Mission

- **Steve Jobs** — *The product is what we say it is. Pick the right thing to say. Don't be three things; be one thing that does three things.*
- **Geoffrey Moore (Crossing the Chasm)** — *The positioning template: "For X who Y, Forge is a Z that does W. Unlike A, Forge does B."*
- **April Dunford (Obviously Awesome)** — *Don't position against the obvious competitor. Position against the alternative the user would actually use otherwise.*
- **Dieter Rams** — *Less, but better. Cut every word that isn't earning its place.*

---

## How To Run This Mission

The reframe rests on a single sentence:

> **Forge is the fastest way to build a mini-app — a form, a landing page, a proposal, a pitch deck, a website prototype, a mobile app design — describe it, ship it, share it, track it. Never touch a database.**

Everything else flows from that. The five-second test: a stranger arriving at `forge.app` should grasp the product before they finish the hero section. The thirty-second test: by the bottom of the landing page, they should know *whether it's for them*.

Avoid the two failure modes:
- **The "everything tool" failure** — describing Forge as "a platform for whatever you need" makes it sound generic. The reframe specifically lists what Forge makes (forms, landing pages, proposals, decks, mobile screens, web prototypes) so the scope is concrete.
- **The "AI buzzword" failure** — leading with "AI-powered" makes the user wonder what's actually built. Lead with what they get; mention the AI as a how, not a what.

Read all the prior marketing copy before changing anything. Note what's working (the warm tone, the specific examples, the "Lucy at Reds Construction" voice). Preserve those; rewrite around them.

Commit on milestones: positioning doc, marketing hero rewrite, marketing page set, in-app empty states, onboarding copy, email templates, screenshots/visuals updated, voice review, tests green.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Positioning Document (The Source of Truth)

1. Write `docs/brand/POSITIONING.md` — the canonical positioning document every later artifact references. Structure:
    - **One-liner**: the 22-word sentence above.
    - **Tagline**: a 3-6 word version. Candidates to test: "Mini-apps in minutes", "Build it. Ship it. Track it.", "From idea to live link in five minutes." Pick the best after reviewing competitors.
    - **Audience**: who Forge is for, in priority order:
        1. Solo professionals & small business owners — contractors, consultants, photographers, tutors, freelancers — who need a custom form / proposal / landing page TODAY.
        2. Founders & operators at small startups — need quick pitch decks, internal one-pagers, customer-facing forms — without a designer or developer.
        3. Designers exploring ideas — want a fast canvas to prototype mobile app screens or web pages and hand off the result.
        4. Anyone who would have used Google Forms, Typeform, Calendly, Canva, or Carrd — Forge replaces several of these with one tool that's better at each.
    - **Categories Forge competes in** (and the alternative the user would have used otherwise):
        - vs. Google Forms / Typeform → Forge gives a branded form with analytics and built-in scheduling.
        - vs. Calendly / SavvyCal → Forge bundles booking into the form so there's only one link to share.
        - vs. PandaDoc / Proposify → Forge generates the proposal from a sentence and tracks who reads what section.
        - vs. Canva pitch deck templates → Forge writes the deck and handles the design.
        - vs. Carrd / Framer → Forge gives a one-page site with built-in submission handling.
        - vs. Figma / Sketch → Forge generates mobile app screens or website mockups from a prompt and lets you hand them off.
    - **What we're explicitly NOT**:
        - Not a code editor. Not Cursor, not Bolt, not Lovable.
        - Not a full-app builder for SaaS products.
        - Not a database. The user's data stays in Forge for the things Forge handles (form submissions, page analytics) and they don't manage tables, migrations, or schemas.
        - Not a Figma replacement for working designers — Figma's collaboration and component-system depth is out of scope.
    - **Voice attributes**:
        - Specific over abstract ("a fence-installation quote in 3 minutes" not "boost productivity").
        - Direct without being cold. Lucy's coworker, not a Silicon Valley product manager.
        - Confident without overstating.
        - Never apologetic, never robotic, never effusive.
    - **Three sample sentences in the brand voice** that any future copy can mimic:
        1. "Describe your business. Forge builds the page. Share the link."
        2. "Your contact form, your proposal, your pitch deck — all built the same way, all tracked the same way."
        3. "When you outgrow it, take it with you. Until then, Forge handles everything."
2. Get the positioning document reviewed by a second human (Brian, ideally) before anything downstream changes. Iteration is much cheaper at this stage than after 30 marketing pages have been rewritten against the wrong frame.

### Phase 2 — Marketing Hero Rewrite

3. The landing page hero changes from "AI page builder for small businesses" to the new reframe. The hero is roughly:
    - **H1** (the 5-second test): "**Mini-apps in minutes.**" Or whichever final tagline wins from Phase 1.
    - **Subhead**: "Forms, proposals, pitch decks, landing pages, mobile screens, websites. Describe what you want. Forge builds it, tracks it, and hands it back."
    - **Primary CTA**: "Start free" — routes to signup. The word "free" here is the upgrade hook (matches our new tier from V2-04).
    - **Secondary CTA**: "See how it works" — anchors to a 60-second demo video below the fold.
    - **Trust signal**: "Trusted by [N] makers, contractors, founders" with a small avatar strip. (Once we have real customer logos; placeholder until then.)
4. Below the hero, a **workflow tile grid** — six tiles (mobile app design, web page, contact form, proposal, pitch deck, landing page), each with a 50-pixel icon, a 3-word label, and a 1-line caption. Click any tile → routes to a workflow-specific landing page. This visually demonstrates the breadth without making anyone read a list.
5. Continue down the page with the same content shape that exists today (live demo, examples, pricing teaser, FAQ, trust strip), with copy rewritten to the new positioning. Don't rebuild the whole page — refresh it.
6. The hero supports the "everything Forge can build" tile-grid being **rotational**: every 7 seconds the active tile gently shifts and the hero subhead briefly highlights that workflow. Subtle, not flashy. Conveys breadth without listing.

### Phase 3 — Marketing Workflow Pages

7. Each of the six workflows (the existing three from W-01/02/03 plus the three new ones from V2-02/03) gets its own dedicated landing page at `/workflows/{slug}`:
    - **Mobile app design** (`/workflows/mobile-app`)
    - **Website / web page** (`/workflows/website`)
    - **Contact form** (`/workflows/contact-form`)
    - **Proposal** (`/workflows/proposal`)
    - **Pitch deck** (`/workflows/pitch-deck`)
    - **Landing page** (`/workflows/landing-page`)
8. Each follows the same shape:
    - Hero specific to that use case (e.g., for mobile app: "Design mobile app screens by describing them. No Figma required.").
    - 30-second demo video or animated GIF — a real generation example.
    - Three big "What you get" cards — the concrete deliverables.
    - One-paragraph "How it works" with three steps.
    - Three-card "Built for" persona block (e.g., for proposals: contractors / consultants / agencies).
    - Real example gallery — 3-4 actual outputs Forge has produced for that workflow.
    - FAQ — 5-6 questions specific to this workflow's edge cases.
    - "Compare to" strip — a small inline comparison vs the alternative tool ("Why Forge instead of Calendly / PandaDoc / Figma?") with 3-4 honest tradeoffs. We don't pretend to replace Figma for a working designer; we say "if you'd rather describe it than draw it, Forge is faster."
    - CTA strip at the bottom: "Start your first {workflow} free."
9. Cross-link discoverability — every workflow page has a "More you can build with Forge" strip at the bottom showing the other five.

### Phase 4 — Pricing Page Rewrite

10. Wait for V2-04 (the pricing & rate limit mission) before finalizing the pricing page numbers. But the structure is decided here:
    - **Three columns** — Free, Pro, Max — using the same warm card style as the rest of the site, with one column visually emphasized as "Most popular" (Pro).
    - Each column: plan name, monthly price, **one-sentence positioning** ("For trying Forge" / "For most makers" / "For pros who use Forge daily"), then a feature checklist.
    - Below the columns: a usage-explainer band that surfaces the new "session usage with weekly cap" model in plain terms (drawn from V2-04). Includes the percentage-bar visualization so people see what hitting a limit looks like before they hit one.
    - FAQ at the bottom answering the questions everyone asks: "What happens if I hit my limit?", "Can I upgrade or downgrade anytime?", "Is the free tier really free?", "Do you charge for AI separately?", "What's the difference between Pro and Max?"
11. The "Compare plans" detailed table is hidden under a disclosure ("See full comparison →") so the primary view stays scannable.

### Phase 5 — In-App Copy Audit & Rewrite

12. Walk every screen of the in-app surface (Dashboard, Studio, Page Detail, Settings, Analytics, Admin) and update strings that conflict with the new positioning:
    - "Generate page" → "Build mini-app" or "Generate" depending on context (Studio's primary CTA stays simple; the description above can use "mini-app").
    - "Page" → "mini-app" in user-facing copy where the term clarifies. In contexts where "page" is unambiguous (e.g., Page Detail header for a specific contact form), keep "page" — don't force the new term where it adds ambiguity.
    - "Forms" / "Proposals" / "Decks" stay as workflow names — they're clear and concrete.
    - Empty states: every empty state's copy rewritten to match the new voice. "No pages yet" → "Nothing built yet — describe what you want above and Forge will start."
    - Onboarding step titles, hint text, success toast messages — all swept.
13. Compile the rewrite into a single PR `chore(copy): refresh in-app strings for v2 positioning` with every diff visible for review. Easier to review one big copy PR than many small ones; semantically reverse of the usual.
14. Voice consistency check: pick 30 random user-facing strings across the app, score each on the voice rubric (specific/direct/warm/non-apologetic/non-robotic). Anything below 4/5 gets another pass.

### Phase 6 — Email Templates

15. Update every transactional and lifecycle email to the new voice:
    - Welcome email → reframes around "your first mini-app" rather than "your first page".
    - First-page-published email → "Your mini-app is live" with the analytics tracking pitch.
    - Submission notification → "{submitter} just submitted to {mini_app_name}".
    - Trial reminder → reframes Pro value around the new positioning.
    - Quota-warning emails → use the "session/weekly" language from V2-04.
    - Invitation emails → "{inviter} invited you to {org_name} on Forge — the mini-app platform".
16. Run a final pass on the SUBJECT lines specifically — the subject is 80% of email open rate. Subject patterns: action-first ("Your mini-app is live"), specific ("Dan booked Tuesday at 2pm"), warm ("Welcome to Forge — let's build something").

### Phase 7 — Visual Refresh

17. Replace stock screenshots / illustrations on the marketing site with new ones reflecting the broadened scope. The hero animation now cycles through 6 outputs (mobile screen, website, form, proposal, deck, landing) instead of 3.
18. Update OG images for every page so social shares look right.
19. Update the favicon and homepage `og:image` if the brand has shifted enough to warrant it (likely not — the wordmark stays).
20. The 6 workflow icons get a consistent pictographic style — same line weight, same corner radius treatment, same internal spacing. Susan Kare lens: glanceable, unmistakable.

### Phase 8 — App Store Optimization & SEO

21. Rewrite meta titles + descriptions for every marketing page to the new positioning. Targeted keywords:
    - "AI mini-app builder"
    - "AI form builder"
    - "AI pitch deck generator"
    - "AI proposal generator"
    - "AI landing page generator"
    - "AI mobile app design tool"
    - "Typeform alternative" / "Calendly alternative" / "Carrd alternative" — long-tail comparison queries
22. Build out a `/compare/forge-vs-{competitor}` page for each major alternative (Typeform, Calendly, Carrd, PandaDoc, Canva for pitch decks). Each is honest, specific about tradeoffs, and links back to the relevant workflow page. SEO captures intent ("typeform alternative") and converts at higher rates than generic landing.
23. Submit the updated sitemap.xml, refresh the robots.txt directives if needed, ping Google Search Console.

### Phase 9 — Onboarding Reframe

24. The onboarding wizard's copy is updated — the workflow-picker step from W-04 now shows six workflow tiles (mobile app, website, contact form, proposal, pitch deck, landing page) instead of three. Picking any one routes the user into Studio with a starter prompt for that workflow.
25. The very first Studio empty state references the new positioning explicitly: "Describe a mini-app — a form, a landing page, a proposal, a pitch deck, a mobile screen, a website. Forge builds it." The example chips below cycle through realistic prompts for each workflow, not just contact forms.
26. Onboarding tour hints (the dismissible ones from W-04) reference the broader scope when relevant: "You can build any of these surfaces the same way — describe it, edit any part by clicking, share the link."

### Phase 10 — The Handoff Pitch (Critical to the Brand)

27. The "easy handoff" promise is a key differentiator and is undersold today. Every workflow page and the homepage explicitly mentions:
    - "Take it with you" — every Forge mini-app exports cleanly. HTML for forms / landing pages / proposals; figma-ready layouts for mobile screens; PPTX for decks; bundled assets for websites.
    - "Or just keep it on Forge" — if the user doesn't want to migrate, the mini-app stays hosted, tracked, and updateable on Forge as long as they have an account.
28. A dedicated `/handoff` marketing page explaining what export formats are supported per workflow, with a 30-second video showing a Figma import of an exported mobile design and a Vercel deploy of an exported HTML landing page.
29. The export functionality already exists for some workflows (proposal PDF, deck PPTX). V2-02 and V2-03 add export for mobile/web designs. The export UX is uniform — every Page Detail has an "Export" action with the available formats per workflow.

### Phase 11 — Press & Launch Materials

30. Write a press kit at `forge.app/press` containing:
    - Logo files (SVG, PNG light/dark, monochrome).
    - Founder photo (Brian).
    - Product screenshots — 12 hi-res images covering the 6 workflows in action.
    - 30-second screen-record of a mini-app being built.
    - Boilerplate paragraph (1, 3, and 5 sentence versions) for journalists.
    - Press contact email.
31. Draft a "Forge launches" blog post (`/blog/introducing-forge`) telling the story of why we built it (Lucy's frustration with phone tag), what we built, who it's for, what's coming next.
32. Set up an X/LinkedIn announcement thread Brian can post on launch day. Specific outputs (a 6-tweet thread + a LinkedIn post + a Hacker News submission) — the agent writes drafts, Brian edits and posts.

### Phase 12 — Internal Alignment

33. Update `docs/brand/VOICE_AND_TONE.md` to reflect the new positioning and the broader scope.
34. Update `apps/web/src/lib/copy/index.ts` (the centralized strings file) with every renamed term. Subsequent components use these constants instead of hardcoded strings, so future positioning shifts are tractable.
35. Update the `README.md` at the repo root — even the engineering README's first paragraph reflects the new positioning. New contributors land on this doc first.
36. Internal Slack/Discord (if any) gets a posted announcement — sets the team's mental model for the new framing.

### Phase 13 — Tests & Documentation

37. Snapshot tests for the rewritten marketing pages — visual regressions caught immediately if the design slips.
38. Copy linter: a CI step that scans for forbidden phrases ("AI page builder", old terminology) and forbidden words ("seamless", "elevate", "leverage") in user-facing strings. Fail the build on hits. Dictates voice discipline going forward.
39. Update `docs/architecture/MARKETING_SITE.md` documenting the page tree and the workflow-page pattern so adding a 7th workflow later is a copy-paste.
40. Mission report.

---

## Acceptance Criteria

- `docs/brand/POSITIONING.md` exists and is the canonical reference; reviewed by Brian.
- Marketing landing page hero, workflow tile grid, and below-the-fold copy reflect the new positioning.
- Six workflow landing pages exist with consistent structure.
- Pricing page structure is in place (numbers fill in from V2-04).
- All in-app strings audited and refreshed to the new voice.
- Email templates updated.
- OG images and visual assets refreshed; six-workflow icon set in place.
- Compare-vs-competitor pages exist for the major alternatives.
- Onboarding wizard supports six workflows.
- "Take it with you" handoff promise is visible on every workflow page and has a dedicated explainer page.
- Press kit complete and accessible at `/press`.
- Launch announcement drafts written.
- Copy linter active in CI; forbidden-phrase tests pass.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
