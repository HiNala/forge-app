# GlideDesign Launch Checklist

Owner fields should be filled by the person who verifies the row. Use screenshots, command output, or external dashboard links as artifacts.

| Area | Check | Owner | Artifact | Status |
|---|---|---|---|---|
| Brand | Logo verified at 16, 32, 64, 96, and 240px in light and dark contexts | | `apps/web/design/regression/glidedesign-baseline-v1/logo-favicon-verification.png` | In progress |
| Brand | Favicon PNG/SVG/app icon set present and wired in metadata/manifest | | `apps/web/public/favicon.svg`, `site.webmanifest` | In progress |
| Social | OG/Twitter cards verified locally and in Twitter/Facebook/LinkedIn/Slack/iMessage validators | | Local home OG capture; external validators pending | In progress |
| Marketing | Homepage, pricing, templates, workflows, compare, and 404 return 200 locally | | Local route checks | Done |
| Marketing | Motion sparkle pass respects reduced motion | | CSS and manual check | In progress |
| App | Authenticated `/app-templates` route separated from public `/templates` | | Local route checks | Done |
| App | Light and dark mode render consistently | | Visual baselines | In progress |
| Public Output | Made-with badge, public pages, print styles, and OG defaults verified | | Pending | Pending |
| Emails | HTML/text templates are GlideDesign branded; external client rendering still requires Litmus/Email on Acid | | Template review + GD-02 report | In progress |
| Domains | `glidedesign.ai`, `app.glidedesign.ai`, `api.glidedesign.ai`, redirects, SPF/DKIM/DMARC documented | | DNS docs; external registrar/Resend check pending | In progress |
| Forbidden Copy | User-facing `Forge`/old-domain copy blocked by CI guard with compatibility allowlist | | `node scripts/ci/forbidden_copy_check.mjs`, `pnpm --filter web copy:check` | Done |
| Visual Regression | Launch baseline captured and runbook/CI discipline documented | | `apps/web/design/regression/glidedesign-baseline-v1/`, visual regression runbook | Done |
| Accessibility | Public-route axe scan has zero serious/critical violations; manual keyboard/screen-reader pass pending | | Isolated Chromium axe scan | In progress |
| Performance | Production build passes; local timing probe captured; Lighthouse pending real staging Clerk env | | `pnpm --filter web build`, GD-02 report timing log | In progress |
| Fresh Eyes | Automated route/title/copy smoke completed; human five-second test still needed | | GD-02 report walkthrough log | In progress |
| Sign-off | GO for staging/internal launch review; NO-GO for public launch until external checks are complete | | GD-02 report recommendation | In progress |
