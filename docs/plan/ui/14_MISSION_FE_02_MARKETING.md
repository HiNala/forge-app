# MISSION FE-02 — Marketing Surface (Landing, Pricing, Gallery, Signup Funnel)

**Goal:** Build the public-facing marketing surface — landing page, pricing, template gallery preview, FAQ, signup funnel — as a production-grade, SEO-tuned, conversion-optimized destination. This is where a stranger decides in 8 seconds whether Forge is worth their time. Every section earns its place or goes. The live demo in the hero actually calls the Studio generate endpoint so visitors see Forge work before they sign up.

**Branch:** `mission-fe-02-marketing`
**Prerequisites:** FE-01 complete. Design tokens and primitives are in place.
**Estimated scope:** Medium. One big route group, ~8 pages, one high-impact interactive hero.

---

## The Mixture of Experts Lens for This Mission

- **Jobs** — *"Would I personally love using this every day? Does this create delight the first time someone uses it?"* Every section must hold a first-time visitor's attention.
- **Kare** — *"Can users understand this instantly without reading?"* The hero communicates in 2 seconds what Forge does.
- **Atkinson** — *"Where are the moments of joy?"* The live demo is one. Make more.
- **Rams** — *"Is this honest about what it does?"* No oversold claims, no fake metrics, no stock photos of people pretending to be productive.
- **Spiegel** — *"Does this match how people actually behave?"* Lucy scrolls with her thumb. Desktop is second.

---

## How To Run This Mission

Read the uploaded `Forge_Landing_Page_v2.html` end-to-end before writing code. That file is the visual reference — the warm cream palette, the serif display, the sectional rhythm. Do NOT copy its HTML literally. Re-implement it in React with the design tokens from FE-01 and proper component decomposition.

The hero must work — the input field actually generates a preview. This is the product's single best ad. Everything after that section exists to handle visitors who want more before signing up.

Commit on section completion: hero working, how-it-works live, gallery rendering from real templates, pricing page live, FAQ expanded, footer complete, SEO/OG wired.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**

---

## TODO List

### Phase 1 — Route Scaffold

1. Under `apps/web/src/app/(marketing)/`, create: `layout.tsx` (marketing chrome — nav + footer), `page.tsx` (landing), `pricing/page.tsx`, `examples/page.tsx`, `examples/[slug]/page.tsx`, `signin/page.tsx`, `signup/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`.
2. Marketing layout is NOT authenticated — anonymous visitors reach these routes. Add a sticky top navigation with: Forge logo (left), links (Pricing · Examples · Sign in), "Start free" primary CTA (right).
3. Footer: small print column (copyright, made by Digital Studio Labs), links column (Pricing, Examples, Terms, Privacy, Contact), a subtle "status" link pointing to `status.forge.app`.
4. Every marketing page uses the `Container` primitive at `xl` max-width. Never let copy lines run wider than 65ch.

### Phase 2 — The Hero (The Live Demo)

5. Build the hero section: large serif headline ("Describe what you need. Get a page."), one-line sub-headline, live demo input, and below it a live preview pane that actually fills in when the user submits a prompt.
6. The input has a placeholder that rotates through example prompts every 4 seconds: "a booking page for my small construction business", "a contact form with file uploads for photographers", "a one-page sales proposal with accept/decline", etc. Rotation pauses on focus.
7. Three suggestion chips under the input: "Booking form · Event RSVP · Sales proposal." Clicking a chip fills the input and auto-submits.
8. On submit: open an anonymous SSE connection to a dedicated demo endpoint `POST /api/v1/public/demo` (backend implements this as a rate-limited, no-save version of Studio generate — one generation per IP per 10 minutes, heavily cached). Stream the HTML chunks into a browser-chrome preview frame below the input.
9. The preview frame is a styled `div` showing a fake browser bar (Safari-chrome aesthetic, warm), an iframe with `srcDoc`, and a small "Like what you see?" CTA after completion that deep-links to signup with `?source=hero_demo`.
10. If the user doesn't submit within 15 seconds of landing, autostart the demo with a pre-picked prompt ("a small jobs booking page for a contractor") so passive visitors see Forge in motion without effort.
11. If the backend demo endpoint is rate-limited or down, fall back to a pre-rendered animation cycling through 3 cached generation results (saved as static HTML in `public/demo-cache/`). Never show an error here — this is the single most important section.

### Phase 3 — How It Works

12. Three-step section, each step with an icon, a short headline, a 1-2 sentence description. Steps:
    - **Describe it.** — Type what you need. No templates to pick from unless you want one.
    - **See it built.** — Forge generates a branded page in seconds. Refine by clicking any section.
    - **Share the link.** — Publish, paste the URL into your website or email, done.
13. Scroll-reveal each step as it enters the viewport using `useInView` + `fadeUp` motion.

### Phase 4 — Gallery / Example Outputs

14. A grid of 6 hand-picked templates showing what Forge produces. Each card is a thumbnail preview image + name + category tag.
15. Each card links to the hosted live preview at `/examples/[slug]` (see FE-01 from the Templates mission for the backing endpoint).
16. Card hover: the thumbnail image crossfades to a second state (e.g., "filled out form" state) to hint at interactivity without breaking layout.
17. Below the grid: a secondary CTA "See all templates →" going to `/examples`.

### Phase 5 — Pricing Page

18. Three-card pricing grid: Starter, Pro (highlighted / recommended), Enterprise (contact).
19. Pricing card anatomy: plan name, monthly price (toggle annual with 2-months-free), 5-7 feature bullets emphasizing differences, primary CTA.
20. Under the cards, a comparison table for visitors who want detail: 15 rows across the common questions (pages limit, submissions limit, custom domain yes/no, team seats, support tier, analytics retention).
21. FAQ at the bottom of the pricing page — accordion-style, 6-8 common billing questions.
22. Pricing page gets trial logic: clicking the Starter CTA routes to signup with plan pre-selected; clicking the Pro CTA also pre-selects Pro trial; Enterprise opens an email `mailto:` or a contact form in a Dialog.

### Phase 6 — Social Proof (Restraint Required)

23. A single testimonial section. Real quotes only. If the product doesn't have real users yet, this section omits — do NOT fabricate testimonials. A plain "currently serving X pages" counter (only if the number is real and meaningful) can substitute.
24. If real testimonials exist: three cards with headshot (or initials avatar fallback), name, role, company, a 1-sentence quote. No "transformed our business" hype. Honest, specific outcomes only.
25. Optional: a row of customer logos (only if the logos are real and the customer has consented).

### Phase 7 — FAQ & Final CTA

26. FAQ section: 8-10 questions. Actually useful ones — "Can I use my own domain?", "What happens if I exceed my submission quota?", "Is this like Lovable or Bolt?", "What AI model powers it?", "Do you charge per submission?", "GDPR?". Accordion, keyboard-navigable.
27. Final CTA section: big serif headline ("Your next page is a sentence away."), a single button, no form.
28. Below everything: a quiet footer with the Digital Studio Labs mark and a link to the parent company.

### Phase 8 — Signup & Signin

29. Sign-up page: email + password OR "Continue with Google" button (the auth provider's component). No form fluff. On success, redirect to `/onboarding`.
30. Sign-in page: mirror of sign-up with "Forgot password?" and "Don't have an account? Sign up" links.
31. Both pages use the marketing layout (no app shell) to keep branding warm.
32. OAuth return handling: Clerk or Auth.js handles the callback; a small client component waits for session resolution then routes to `/onboarding` (first time) or `/dashboard` (returning).

### Phase 9 — Responsive & Cross-Browser

33. Every section must work on a 375px-wide iPhone SE viewport. The hero's preview frame collapses to stack under the input on mobile.
34. Test on mobile Safari, mobile Chrome, desktop Safari, desktop Chrome, desktop Firefox. Fix any broken rendering.
35. Touch targets ≥ 44px. Tap-highlight removed. No hover-only affordances (everything must also work on tap).

### Phase 10 — SEO, Open Graph, Sitemap

36. Every page has a unique `<title>` and meta description via Next.js `generateMetadata`.
37. Open Graph images: one generic one for the landing (`og-forge.png`, 1200x630) featuring the hero headline over the warm cream palette. Per-page overrides for pricing and examples.
38. JSON-LD structured data on the landing page: `Organization` + `SoftwareApplication` schemas.
39. `robots.txt` permits `/`, `/pricing`, `/examples/*`, `/signin`, `/signup`; disallows `/app/*`, `/api/*`, `/p/*` (published page host is a different subdomain but safe to explicitly disallow).
40. `sitemap.xml` auto-generated via Next.js' built-in sitemap support, listing all marketing routes plus `/examples/*` template URLs (pulled from the templates API at build time, if templates exist).

### Phase 11 — Performance

41. Mobile Lighthouse ≥ 95 on the landing page. Desktop ≥ 98.
42. Total JS shipped on the landing page: < 100KB gzipped initial. Code-split the demo logic so visitors who don't interact with the hero don't pay for it.
43. Images: use Next.js `<Image>` everywhere. Priority load only on the hero. Below-the-fold images lazy-load.
44. Preload `--font-display` only; let `--font-body` fall back gracefully during FOUT.
45. CLS = 0 measured with real scroll traces.

### Phase 12 — Tests

46. Visual regression snapshot of each marketing page at three viewports (375, 768, 1280). Use Playwright.
47. E2E test: land on `/`, submit the hero demo input, verify preview renders, click "Start free," land on signup.
48. Accessibility: axe-core on each marketing page. Zero violations.
49. Mission report.

---

## Acceptance Criteria

- All marketing routes built, styled per the design, and responsive.
- Hero demo actually generates a preview via the backend and handles the rate-limit fallback gracefully.
- Pricing page renders three tiers with working CTAs to signup and Stripe checkout.
- Signup and signin flows work end-to-end.
- Mobile Lighthouse ≥ 95, CLS = 0.
- OG images, sitemap, robots, JSON-LD all in place.
- No fake metrics, no fabricated testimonials.
- Axe-core clean across every marketing page.
- Mission report written.

---

## Repo tracking (living)

Current depth vs this brief: **[FRONTEND_STATUS.md](./FRONTEND_STATUS.md)** · Shipped scope: [MISSION-FE-02-REPORT.md](../MISSION-FE-02-REPORT.md)

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
