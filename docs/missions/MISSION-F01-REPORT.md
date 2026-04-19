# Mission F01 — Design foundation (report)

## Summary

Frontend Mission F01 establishes the Forge design system in `apps/web`: CSS tokens, Tailwind v4 (`@theme` + class-based `dark` via `@custom-variant`), `tailwind.config.ts` (`content`, `darkMode: "class"`), `next/font` variables **`--font-display`** / **`--font-body`** (Cormorant Garamond + Manrope), Framer Motion presets, base UI primitives (Radix-backed where needed), app chrome (sidebar with persisted collapse + best-effort API sync, top bar, empty state), a dev-only **`/dev/primitives`** gallery (404 in production), and Sonner toasts (bottom-center, 4s, hover pause, `toast-in` animation).

## Design artifact

The Anthropic endpoint  
`https://api.anthropic.com/v1/design/h/ZhxfTfNViMkEnjhpg1EkxA`  
requires a valid `ANTHROPIC_API_KEY`. Without it the API returns **401** (`unsupported authentication method for HTTP endpoint`). **`apps/web/design/artifact.json` is not in-repo until someone runs `FETCH_DESIGN.md` locally.** Tokens are aligned with the locked Forge palette; after fetch, reconcile `src/styles/tokens.css` with the designer README and update `apps/web/design/INDEX.md`.

## Delivered (acceptance mapping)

| Criterion | Status |
| --------- | ------ |
| Artifact fetched + README summarized | **Pending** — blocked on API key; `FETCH_DESIGN.md` + `design/README.md` placeholder document the handoff. |
| `tokens.css` + Tailwind via CSS variables | **Done** — `src/styles/tokens.css`; utilities like `bg-bg`, `text-text`; class-based `.dark` subtree. |
| `tailwind.config.ts` (mission §Phase 3) | **Done** — `apps/web/tailwind.config.ts` (`darkMode: "class"`, `content`); extended theme lives in CSS v4 `@theme`. |
| Typography `next/font` | **Done** — `src/app/fonts.ts`; variables match mission names `--font-display` / `--font-body`; fallbacks in `globals.css` base layer. |
| Primitives + `/dev/primitives` | **Done** — all listed components under `src/components/ui/`; showcase `src/app/dev/primitives/`. |
| Sidebar, TopBar, EmptyState in `(app)/layout` | **Done** — `src/components/chrome/*`, wired in `src/app/(app)/layout.tsx`. |
| Framer Motion + `MOTION.md` + keyframes | **Done** — `src/lib/motion.ts`, `design/MOTION.md`, keyframes in `globals.css`. |
| ThemeProvider + PaletteSwitcher (⌃⇧P) | **Done** — `theme-light-warm` class + `data-theme` on `<html>`. |
| Sidebar backend sync | **Done (best-effort)** — `PATCH ${NEXT_PUBLIC_API_URL}/v1/me/preferences` with `sidebar_collapsed`; fails silently until API exists. |
| Screenshots (Teal / Sage / Indigo) | **Manual** — add PNGs under `design/screenshots/` per that folder’s README after local `pnpm dev`. |
| axe-core 0 violations + Lighthouse ≥ 95 on `/dev/primitives` | **Run locally** — not automated in CI here; run against `pnpm dev` + production build as needed. |
| PR from `mission-f01-design-foundation` | **Contributor** — create branch and open PR when ready (see Git coordination below). |

## Git / coordination

Use branch **`mission-f01-design-foundation`** for F01-only commits so parallel API/backend work can merge cleanly. If your clone is on another mission branch, either:

```bash
git fetch origin
git checkout -b mission-f01-design-foundation
# commit apps/web/** + docs/missions/MISSION-F01-REPORT.md + docs/design/OPEN_QUESTIONS.md as appropriate
```

…or cherry-pick the F01 file set.

## Deferred

- Commit real `artifact.json` + designer README; map token names from artifact.
- Baseline screenshots (`primitives-baseline.png`, `primitives-sage.png`, `primitives-indigo.png`).
- Formal axe + Lighthouse numbers recorded in-repo after local runs.
