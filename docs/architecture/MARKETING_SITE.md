# Marketing site — page tree (V2-P01)

Canonical positioning: `docs/brand/POSITIONING.md`. Central UI strings: `apps/web/src/lib/copy/index.ts`. Workflow copy and metadata: `apps/web/src/lib/workflow-landings.ts`.

## Top-level routes

| Path | Purpose |
|------|---------|
| `/` | Home — hero, workflow spotlight + six tiles (7s rotation), demo, how it works, gallery, FAQ |
| `/pricing` | Free / Pro / Max (placeholders until V2-P04 billing), usage explainer bar, comparison under `<details>` |
| `/examples`, `/examples/[slug]` | Example gallery (existing) |
| `/workflows/[slug]` | **Six** workflow landings: `mobile-app`, `website`, `contact-form`, `proposal`, `pitch-deck`, `landing-page` (static-generated) |
| `/compare/forge-vs-[slug]` | Honest compare pages: `typeform`, `calendly`, `carrd`, `pandadoc`, `canva-pitch-decks` |
| `/handoff` | Export matrix and “take it with you” story |
| `/press` | Press kit — boilerplate, contact, asset placeholders |
| `/blog/introducing-forge` | Launch story post (draft-level) |
| `/signup`, `/signin`, `/terms`, `/privacy` | Funnel and legal |

## Adding a 7th workflow

1. Add slug to `WORKFLOW_SLUGS` in `workflow-landings.ts` and a full `WORKFLOW_LANDINGS[slug]` object (meta, hero, what you get, FAQ, compare, etc.).
2. `generateStaticParams` in `app/(marketing)/workflows/[slug]/page.tsx` picks up new slugs automatically.
3. Add a tile in `WorkflowHeroPanel` (icons map in the same file).
4. If onboarding should include it, extend `onboarding/page.tsx` cards and `user_preferences_full.py` + `patchUserPreferences` types.
5. Extend Studio URL → prompt primes in `studio-workspace.tsx`.
6. Update `app/sitemap.ts` if you add routes outside the patterns below.

## Sitemap

`app/sitemap.ts` should list marketing URLs explicitly or derive from the same const arrays as landings and compare slugs when those lists grow.
