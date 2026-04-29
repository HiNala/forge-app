# Mission GD-02 Report: Polish, Sparkle & Verification

## Status

Completed locally; external launch checks pending account/dashboard access.

## Summary

GD-02 raises the GD-01 rebrand from structurally complete to launch-grade: motion polish, asset review, accessibility/performance verification, visual regression, fresh-eyes walkthroughs, and launch checklist sign-off.

## Fixes Landed During Verification

- Resolved a Next.js route conflict by moving the authenticated template browser from `/templates` to `/app-templates`, preserving public `/templates` for marketing.
- Verified local `200` responses for `/`, `/pricing`, `/templates`, and `/app-templates` after the route split.
- Captured initial public-route visual baselines for light/dark and desktop/tablet/mobile.
- Added GlideDesign empty/error/not-found illustrations and wired them into shared empty states plus error UI.
- Added CI copy guards for user-facing legacy `Forge`/old-domain copy with compatibility-safe allowlists.

## Logo, Favicon, and OG Verification

- Local logo/favicon contact sheet: `apps/web/design/regression/glidedesign-baseline-v1/logo-favicon-verification.png`.
- Existing favicon/app icon assets verified present: SVG favicon, PNG favicons, Apple touch icon, Android 192/512 icons, PWA manifest.
- Homepage OG card renders locally at `/opengraph-image` and was restyled to the GlideDesign visual system.
- Nested pricing/examples OG routes currently return 404 in dev and are tracked as a verification defect unless Next metadata routing behavior is intentionally different in production.
- External validator checks for Twitter, Facebook, LinkedIn, Slack, iMessage, iOS/Android home-screen, and search previews require manual browser/account access.

## Asset Re-Pass

- Marketing asset manifest generated at `apps/web/public/marketing/MANIFEST.json` with 64 assets, source prompts, family, and iteration metadata.
- Empty/error/not-found illustration family added under `apps/web/public/brand/illustrations/`.

## Empty-State Inventory

- Dashboard fresh state uses the shared GlideDesign illustration and clear Studio/templates CTAs.
- Pages index empty and filtered-empty states now use shared illustration, warm copy, and specific CTAs.
- App template filter-empty state now uses shared illustration and “Clear filters” / “Start from Studio” CTAs.
- Submissions empty state now explains the recovery action and offers “Share page.”
- Org analytics empty state now frames the first visitor moment and links to pages/Studio.

## Microcopy Diff Samples

- Feedback strip button: `Submit` → `Send feedback`.
- App error headline: `Something went wrong` → `This screen missed its mark`.
- App error CTA: `Try again` → `Reload screen`.
- Global error body now names the app shell and asks for one clear recovery action plus support reference.

## Email, Domain, and Routing

- `EMAIL_FROM` defaults to `GlideDesign <noreply@glidedesign.ai>`.
- DNS setup docs now require SPF, DKIM, and DMARC records for `glidedesign.ai`.
- Invitation, notification, confirmation, billing-failed, and reply email templates are GlideDesign branded in HTML/text fallbacks.
- Billing-failed and reply email HTML were upgraded from generic gray system styling to the GlideDesign violet/coral email shell with branded footer.
- Resend health check is available via the API health checks when `RESEND_API_KEY` exists.

## Motion Design Pass

- Homepage hero headline/subhead/CTA now fade up with 0/200/400ms stagger.
- Hero mesh tuned to a subtle 60s violet/coral drift with reduced-motion fallback.
- Homepage template cards now use 200ms scale/lift/saturation hover and reveal the “View templates” pill.
- Pricing Pro card gets a subtle 8s animated gradient border.
- Brand buttons now have stronger hover lift, gradient-position shift, and 0.98 press scale.
- Sidebar active route indicator now slides between non-primary routes with a 300ms cubic-bezier transition and reduced-motion fallback.
- Toggle switch gradient activation and thumb travel now use a smooth 220ms transition with reduced-motion fallback.
- Toast gradient rail updated to the GlideDesign gradient utility while preserving the 240ms entrance.

## Visual Regression

Baseline folder: `apps/web/design/regression/glidedesign-baseline-v1/`.

Captured locally:

- Routes: `/`, `/pricing`, `/templates`, `/workflows`, `/compare`, `/definitely/missing/gd02`.
- Themes: light and dark.
- Breakpoints: 1440x900, 834x1112, 390x844.
- Marketing routes returned `200`; true 404 route returned `404`.
- Runbook added at `apps/web/design/regression/GLIDEDESIGN_VISUAL_REGRESSION.md`.
- Latest refresh used isolated browser contexts per route/theme/breakpoint after a same-context run exposed a transient `/compare` redirect loop.

## Verification Log

- `node scripts/ci/forbidden_copy_check.mjs` — passed.
- `pnpm --filter web copy:check` — passed.
- Local route checks for `/`, `/pricing`, `/templates`, `/app-templates` — all returned `200`.
- Public-route axe scan in isolated Chromium contexts — zero serious/critical violations on `/`, `/pricing`, `/templates`, `/workflows`, `/compare`; 404 had only non-serious issues.
- Fixed public-route contrast by strengthening subtle text tokens and section label color.
- `pnpm --filter web build` — passed after fixing rebrand type aliases and pricing card typing.
- Local timing probe on dev server: `/` DOM 1630ms / idle 4611ms; `/pricing` DOM 7719ms / idle 9792ms; `/templates` DOM 1833ms / idle 3689ms; `/workflows` DOM 3858ms / idle 6278ms; `/compare` DOM 3482ms / idle 5262ms.
- `next start` local production probing was blocked without a real Clerk publishable key; a syntactically shaped fake key caused Clerk network hangs, so Lighthouse must be run with real staging Clerk env.

## Pending External Verification

- Browser-specific favicon previews.
- Social unfurl validators.
- Litmus/Email on Acid email rendering.
- DNS, Stripe Dashboard branding, Resend deliverability, OAuth consent screens.
- Lighthouse against a staging/prod `next start` target with real Clerk keys.
- Human fresh-eyes walkthrough, five-second test, and screenshot test.

## Fresh-Eyes Walkthrough

- Public marketing smoke checked `/`, `/pricing`, `/templates`, `/workflows`, `/compare`, `/signin`, `/signup`, and a true nested 404.
- Copy guard re-run found one forbidden phrase (`page builder`) in comparison metadata; fixed to `one-page site tool`.
- Public route text/title smoke confirmed GlideDesign naming on key marketing and auth entry routes.
- Visual baselines were corrected to use a true nested 404 route instead of a single-slug public page fallback.

## GO / NO-GO Recommendation

GO for staging/internal launch review.

NO-GO for public launch until external account-dependent checks are completed:

- Real Clerk-backed `next start` / Lighthouse run.
- Social unfurl validators.
- DNS, Resend domain, SPF/DKIM/DMARC, and redirect verification.
- Litmus/Email on Acid rendering.
- Human fresh-eyes five-second test and final stakeholder sign-off.
