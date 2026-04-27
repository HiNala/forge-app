# V2-P01 — Strategic reframe (mission report)

## Summary

Positioning is unified around the **mini-app platform** story end-to-end: canonical brand docs, marketing home with six-workflow spotlight, six workflow landings (one dynamic route), Free/Pro/Max pricing structure with usage explainer and comparison under disclosure, compare pages for major alternatives, handoff and press surfaces, blog post, centralized `lib/copy`, API `onboarded_for_workflow` extended for six workflows, onboarding and Studio copy updated, transactional email subjects and templates aligned, sitemap expanded, `pnpm copy:check` in CI verify, and `docs/architecture/MARKETING_SITE.md` for future workflows.

## Human sign-off

- **`docs/brand/POSITIONING.md`**: written for Brian (or product owner) review per mission; **not** substitute for that review in this environment.

## Verification checklist (mission acceptance)

| Criterion | Status |
|-----------|--------|
| `docs/brand/POSITIONING.md` | Done |
| Hero, tile grid, below-fold alignment | Done (tiles + 7s spotlight in `WorkflowHeroPanel`) |
| Six workflow pages, shared structure | Done (`workflows/[slug]`) |
| Pricing structure (numbers TBD V2-P04) | Done |
| In-app strings (high-traffic paths) | Done (Studio, Pages index, onboarding, toasts; full app sweep is continuous) |
| Email templates | Done (API `EmailService`, `email_invite`, Jinja templates touched) |
| OG / visual assets | Partial: metadata on new pages; dedicated OG image generation not added for every workflow (optional follow-up) |
| Six workflow icons | Done (Lucide, consistent stroke in `WorkflowHeroPanel`) |
| Compare pages | Done (`/compare/forge-vs-*`) |
| Onboarding six workflows | Done |
| Handoff promise on workflow pages + `/handoff` | Done |
| Press `/press` | Done (placeholders for photos and asset zip) |
| Launch drafts | Done (`docs/launch/V2_P01_ANNOUNCEMENT_DRAFTS.md`) |
| Copy linter in CI | Done — `pnpm --filter web copy:check` in root `verify` **and** `.github/workflows/ci.yml` (`test-web` job) |
| Mission report | This file |

## Follow-ups (not blocking P01)

- Regenerate `apps/api/openapi.json` if your pipeline requires OpenAPI to match `UserPreferences` literals.
- Google Search Console ping and `robots.txt` review when deploying to production host.
- Snapshot / visual tests for marketing: extend Playwright or Chromatic when design stabilizes.
- Replace press kit placeholders with real assets and wire `press@forge.app`.
