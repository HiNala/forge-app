# Migration guides (honest off-ramps)

These steps assume you have already used **Page → Export** for the right format (static HTML, CSV, or a generated project) and, where relevant, a **custom domain** under **Settings**.

## Vercel / Netlify / Cloudflare Pages (static)

1. Export **single HTML** or a **static bundle** (when available) for the page or site.
2. Create a new project and point the build output to the unzipped folder (usually `out/` or repository root, depending on the template).
3. In **Settings → Custom domains** on Forge, note your public URL; after cutover, move DNS at your registrar to the new host (see the generated **domain handoff** text export).

## Webflow / Framer (design-led)

1. Use **Framer** or **Webflow JSON** exports when the workflow ships them (check Export cards — roadmap items list what will be inside).
2. Re-link forms to your new backend; until then, keep a form on Forge or use the **submissions** export + **webhook** documentation.

## ESP / waitlists (Mailchimp, ConvertKit, Resend, …)

1. Run **submissions CSV** or **waitlist CSV** (coming soon pages).
2. Import into your provider’s audience tools; map columns carefully.

## Typeform (surveys)

When **Typeform-compatible JSON** is available for your workflow, import using Typeform’s documented import path. Treat it as a one-way migration: verify logic and required fields in their UI.

## Notion / Squarespace / “other”

There is no magic fully automated path; use **HTML** and **image** exports as a visual reference, and **structured CSV/JSON** for data. The goal is **no lock-in** on the data and a clear file you own — not pixel-perfect 1:1 of every host.

If something is missing for your stack, we still want to hear about it: that is how the roadmap is prioritized.
