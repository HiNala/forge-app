# MISSION BP-05 - Distinct Visual Identity & Cohesion Report

**Branch:** `mission-bp05-distinct-visual-identity`  
**Status:** Foundation shipped + first cohesion hardening pass complete. Full multi-route pixel perfection, CI pixel gates, and exhaustive client/email matrix remain explicit follow-up.

## Delivered Artifacts

All canonical identity docs live under `docs/brand/`:

| File | Purpose |
|------|---------|
| `IDENTITY_FOUNDATION.md` | Positioning, personality, visual register, motion register, excluded competitor space, and 2x2 quadrant. |
| `COLOR_SYSTEM.md` | OKLCH palette, contrast discipline, and Claude differentiation notes. |
| `TYPOGRAPHY.md` | Cormorant moments, Manrope workhorse rules, JetBrains Mono technical rules. |
| `MOTION_SYSTEM.md` | Tempos, easings, allowed surfaces, banned motion, and review discipline. |
| `VOICE_AND_TONE.md` | Direct, professional microcopy rules and forbidden phrases. |
| `ICON_MIGRATION.md` | Lucide-only icon policy and migration notes. |
| `LOGO_USAGE.md` | Lockup, favicon, asset, and Stripe-branding usage rules. |
| `SIDE_BY_SIDE_VS_CLAUDE.md` | Internal comparison reference for brand reviews. |
| `COMPONENT_LIBRARY_REFERENCE.md` | Component-to-token reference for design reviews. |

`apps/web/design/regression/baselines/README.md` documents baseline capture hygiene and update rationale.

## Implemented In Code

1. `src/styles/tokens.css` uses the BP-05 workshop palette: bone, sand, linen canvas, graphite ink, copper action, and emerald data accents.
2. `src/styles/motion.css` defines motion tempos and easing variables; `globals.css` imports it.
3. JetBrains Mono is wired through `next/font/google`; technical surfaces use `--font-mono`.
4. Marketing ticker motion was removed; the old infinite marquee pattern is gone.
5. Hero wash is stationary and token-based, not a drifting orb.
6. `fireFirstPublishConfetti` is intentionally inert; Forge no longer emits decorative particle celebrations.
7. OG image templates use workshop neutrals, copper, and emerald.
8. Internal design token pages expose the copper/emerald system narrative.
9. `src/lib/copy/index.ts` starts the centralized copy registry.
10. `scripts/ci/framer_motion_inventory.mjs` lists `framer-motion` imports for review.
11. Static Forge colors are centralized in `src/lib/design/forge-html-fallback-colors.ts` with OKLCH values matching `tokens.css`.
12. Canvas chrome, preview HTML, static exports, onboarding swatches, and OG fallback colors were moved off ad-hoc hex/HSL/RGBA values.

## Reality Check

| Acceptance item | Current state |
|-----------------|---------------|
| Zero hex/RGB/HSL outside tokens in `apps/web/src` | Complete for source scan. Generated schema and `styles/tokens.css` are intentionally excluded. |
| Lucide-only app icons | Confirmed: no `@heroicons`, `react-icons`, or Font Awesome imports under `apps/web/src`. |
| Full route-by-route visual audit | Not complete in this pass; foundations are in place. |
| Email client matrix | Not executed; requires hosted template tooling or Litmus/Email on Acid. |
| Stripe-hosted branding | Documented only; Dashboard credential work remains operational. |
| Visual regression CI gate | Baseline folder exists; Playwright capture and diff gate remain future work. |
| Exhaustive axe crawl | Not run in this pass. |

## Adjacent Fixes

| Issue | Resolution |
|-------|------------|
| Orphaned CSS keyframe body after `shimmer` | Wrapped as `@keyframes fade-in-up`, restoring valid stylesheet structure. |
| Canvas and export borders/shadows used ad-hoc RGBA | Replaced with token shadows and `color-mix(in oklch, ...)`. |
| Onboarding swatches drifted into generic blue/purple/pink SaaS colors | Replaced with Forge copper / emerald / graphite / stone roles. |
| Preview canvas accent generation used HSL | Replaced with OKLCH hue-driven accents. |
| Hover treatments moved cards vertically | Removed layout-changing lift on touched card/input surfaces. |

## Verification Run

- `npm.cmd --prefix apps/web run typecheck` - passed.
- `npm.cmd --prefix apps/web run lint -- --max-warnings 0` - passed.
- `npm.cmd --prefix apps/web run test -- src/lib/web-canvas-static-export.test.ts src/lib/api-url.test.ts --pool=threads --maxWorkers=1` - 10 tests passed.
- `rg "#[0-9a-fA-F]{3,8}|rgba\(|rgb\(|hsl\(" apps/web/src --glob '!styles/tokens.css' --glob '!lib/api/schema.gen.ts'` - no matches.
- `rg "@heroicons|react-icons|@fortawesome" apps/web/src` - no matches.
- `Invoke-WebRequest http://127.0.0.1:3001/` - HTTP 200.
- `docker compose ps` - API, web, worker, Postgres, Redis, and MinIO are running.
- `git -c safe.directory=C:/Users/NalaBook/Desktop/forge-app diff --check` - no whitespace errors; Git reported CRLF normalization warnings only.

## Blocked Verification

In-app browser automation was attempted through the Browser plugin, but the local Node runtime backing `node_repl` is `v22.12.0`; Browser requires `>=22.22.0`. Visual screenshot verification is pending after that runtime is upgraded.

## Long-Term Debt

1. Cormorant display enforcement audit: remove stray legacy hero/display classes on non-exception routes.
2. Motion allowlist lint: promote `motion-inventory` to a CI gate or AST exception list.
3. Stripe hosted surfaces: apply Forge palette/logo in Dashboard and verify checkout/portal continuity.
4. Playwright screenshot baselines and >2% diff approval workflow.
5. Email-client render matrix and receipt/invoice visual parity pass.
6. Exhaustive authenticated axe crawl after the full route polish pass.

**Next merge recommendation:** pair the palette foundation with content/editorial QA on pricing and compare pages so the product voice matches the visual system.
