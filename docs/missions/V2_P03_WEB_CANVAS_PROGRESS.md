# V2-P03 — Web canvas (progress note)

## Completed in this iteration (client)

- **Marquee region select** on each responsive preview row: toolbar / `M` / ⌘-drag; viewport-space overlap against `data-forge-node-id` and `data-forge-region`; teal overlay; floating refine panel (prompt + toast; API wiring remains P-05).
- **Site navigation** dialog: edit labels/paths, add/remove links, **Apply to all pages** rebuilds HTML via `buildPageHtml`.
- **Font pairs** persisted in store with `--fc-font-heading` / `--fc-font-body` on previews.
- **Page menu**: rename, duplicate, delete (guard at least one page).
- **Tests**: `web-marquee-hit.test.ts`; `web-canvas-viewports.test.ts` unchanged.
- **Docs**: `docs/architecture/WEB_CANVAS.md` updated.

## Still out of scope (per architecture note)

Multi-page orchestration, `WebsiteComposer`, exports (Next.js / static / Figma), server-side region sync, and full Page Detail tabs remain future phases.
