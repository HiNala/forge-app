# Web design canvas — quick guide

## Single page vs full site

| Goal | Where to work |
|------|----------------|
| One landing page, form, proposal, or deck (chat + preview) | **Studio** (`/studio`) — same flow as always. |
| Multi-page website with responsive previews and a visual canvas | **Web & website** (`/studio/web`). |

Both are “mini-apps” in Forge positioning; the canvas is the **visual, multi-page** option.

## Canvas basics

1. **Breakpoints** — Use **All** to see desktop, tablet, and mobile together; focus one size to emphasize it.
2. **Add page** — Creates another browser-frame node; paths should stay unique (e.g. `/`, `/about`, `/pricing`).
3. **Homepage** — Page menu → **Set as homepage** (used for orphan warnings).
4. **Site nav** — Toolbar **Site nav** edits shared header links; **Apply** rebuilds every page’s header.
5. **Marquee** — Toolbar **Marquee**, **`M`**, or **⌘/Ctrl-drag** on a preview row to scope a refine (orchestration applies changes in production).
6. **Flow** — Connect nodes with handles, or **Sync links** to auto-create edges from internal `<a href="/path">` links in the HTML.
7. **Preview links** — Clicking a same-site link inside a preview (when not in Marquee mode) **focuses and frames** the target page on the canvas.
8. **Orphans** — A warning appears if a page (except the homepage) has no incoming edge. Link it from another page or draw an edge.
9. **Export** — **Export → Static site (single HTML file)** is one scrollable bundle; **Multi-page HTML (ZIP)** gives one `.html` per page with relative nav (unzip, open `index.html` for `/`). Next.js zip and hosting are pipeline features.

## Tips

- Keep **paths unique**; the store blocks collisions.
- **Grid** snaps nodes to a 3-column layout and fits the view — useful after adding several pages.
- Brand **accent** and **fonts** in **Site tweaks** apply to all previews on the canvas.

For architecture details, see `docs/architecture/WEB_CANVAS.md`.
