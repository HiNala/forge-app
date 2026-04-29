# GlideDesign Master Todo

This is the execution checklist for finishing the GlideDesign rebrand, Figma-inspired visual rebuild, in-app polish, launch verification, and post-rebrand cleanup.

The working loop is simple: pick one surface, inspect it in desktop/tablet/mobile, fix copy/layout/motion/assets, run checks, record evidence, then move to the next surface. Repeat until every section reads as one product.

## Current State Snapshot

- Product name: GlideDesign.
- Primary domain: `glidedesign.ai`.
- Current local repo still contains mixed Forge and GlideDesign-era work.
- GlideDesign identity docs and placeholder SVG assets exist.
- Homepage has an initial Figma-inspired rebuild, but still needs final art, copy encoding cleanup, and visual QA.
- In-app shell exists but needs GlideDesign-specific final polish across dashboard, Studio, settings, billing, admin, public pages, and emails.
- Dark-mode tokens currently need a full GlideDesign pass; no old Forge workshop colors should drive GlideDesign chrome.

## Operating Rules

- Do not mass-find-replace brand strings. Review every match and decide whether it is user-facing, compatibility code, test fixture, or historical docs.
- Marketing should echo Figma principles, not literal Figma pixels: bold type, chunky color blocks, generous whitespace, product screenshots as art, playful primitive geometry.
- App interior should borrow x.com clarity: bold labels, strong hierarchy, dense but readable layout, direct navigation, premium dark mode.
- Every route gets checked in light and dark mode where applicable.
- Every app section gets a real empty, loading, success, error, and disabled state.
- Every asset must have a source prompt or native construction note in the manifest.
- Every visual change must preserve accessibility, keyboard navigation, and reduced-motion behavior.

## Phase 0 - Safety And Baseline

- [ ] Confirm current branch and dirty worktree.
- [ ] Record current local route inventory.
- [ ] Start local stack on `http://127.0.0.1:3001`.
- [ ] Confirm API health on `http://127.0.0.1:8000/health/ready`.
- [ ] Run web typecheck.
- [ ] Run web lint strict.
- [ ] Run forbidden-copy guard.
- [ ] Run targeted route smoke checks for marketing and app routes.
- [ ] Record all current failures in this file before fixing.

## Phase 1 - Brand Foundation

- [x] Create `docs/brand/GLIDEDESIGN_IDENTITY.md`.
- [ ] Expand identity doc with explicit design principles from the supplied Figma screenshots.
- [ ] Add "principles, not pixels" examples for hero, chunky template strip, testimonial, community gallery, and app shell.
- [ ] Add x.com-inspired in-app principles: bold nav, clear route hierarchy, big primary action, dense right-column cards, premium dark mode.
- [ ] Add product naming rules:
  - Use `GlideDesign` in formal product contexts.
  - Use `Glide Design` only where sentence rhythm clearly benefits.
  - Use `glidedesign.ai` for public domain references.
  - Use `hello@glidedesign.ai` for public support/sales contact unless a separate support inbox exists.
- [ ] Define forbidden legacy visible terms: `Forge`, `forge.app`, `workshop palette`, `bone/copper` for user-facing brand material.
- [ ] Define allowed legacy internal terms: compatibility scripts, embed filenames, migration comments, historical mission docs.

## Phase 2 - Logo, Favicon, And Brand Assets

- [ ] Audit current `apps/web/public/brand` SVGs at 16, 24, 32, 64, 96, and 240px.
- [ ] Verify mark-only logo reads at favicon size.
- [ ] Verify lockup reads in header, footer, email, invoice, and app sidebar contexts.
- [ ] Create or refine vector source files:
  - [ ] `logo-full.svg`
  - [ ] `logo-full-dark.svg`
  - [ ] `logo-stacked.svg`
  - [ ] `logo-mark.svg`
  - [ ] `logo-mark-mono.svg`
  - [ ] `wordmark.svg`
- [ ] Regenerate favicon pack:
  - [ ] `favicon.svg`
  - [ ] `favicon.ico`
  - [ ] `favicon-16x16.png`
  - [ ] `favicon-32x32.png`
  - [ ] `apple-touch-icon.png`
  - [ ] `android-chrome-192x192.png`
  - [ ] `android-chrome-512x512.png`
- [ ] Update `site.webmanifest` with GlideDesign name, colors, and icons.
- [ ] Add logo verification screenshots to visual baseline.
- [ ] Update `docs/brand/LOGO_USAGE.md` for GlideDesign, not Forge.

## Phase 3 - Design Tokens

- [ ] Replace old Forge token comments in `apps/web/src/styles/tokens.css`.
- [ ] Ensure default light tokens are GlideDesign:
  - [ ] pure white base
  - [ ] cool whisper raised surfaces
  - [ ] violet tint selected state
  - [ ] violet/coral brand gradient
  - [ ] Figma-inspired marketing blocks
- [ ] Ensure dark tokens are GlideDesign, not Forge:
  - [ ] cool ink background
  - [ ] lifted violet/coral accents
  - [ ] high contrast foregrounds
  - [ ] no copper/emerald workshop overrides in `.dark`
- [ ] Audit `apps/web/src` for hardcoded `#`, `rgb(`, `rgba(`, and `hsl(` outside known generated schemas.
- [ ] Replace hardcoded color values with semantic tokens.
- [ ] Add token docs with contrast pairs:
  - [ ] violet on white
  - [ ] coral on white
  - [ ] white on violet/coral gradient
  - [ ] ink on lime/sky/coral/mint/lavender/mustard
  - [ ] muted text on white
  - [ ] dark-mode foregrounds on ink surfaces
- [ ] Verify Tailwind token classes for every marketing color.

## Phase 4 - Typography

- [ ] Decide final display face:
  - [ ] General Sans via local/fontsource if available, or
  - [ ] Geist as the temporary geometric fallback.
- [ ] Ensure Inter drives app UI.
- [ ] Ensure JetBrains Mono only appears for IDs/code/technical data.
- [ ] Create or verify classes:
  - [ ] `text-display-xl`
  - [ ] `text-display-lg`
  - [ ] `text-display-md`
  - [ ] `text-h1`
  - [ ] `text-h2`
  - [ ] `text-h3`
  - [ ] `text-h4`
  - [ ] `text-body`
  - [ ] `text-body-sm`
  - [ ] `text-caption`
  - [ ] `text-code`
- [ ] Remove inline font sizes in app surfaces unless dynamic clamp is required for marketing display text.
- [ ] Fix all mojibake punctuation sequences in source strings.
- [ ] Verify line breaks at 1440, 1024, 768, and 375px.

## Phase 5 - Marketing Homepage

- [ ] Header:
  - [ ] GlideDesign logo lockup.
  - [ ] Figma-inspired nav spacing and big black primary CTA.
  - [ ] Mobile nav sheet.
  - [ ] Active/hover states.
- [ ] Hero:
  - [ ] Massive headline: "Glide from idea to product."
  - [ ] Direct subhead naming strategy, screens, code, next moves.
  - [ ] Black primary CTA.
  - [ ] Secondary demo CTA.
  - [ ] Animated violet/coral gradient mesh.
  - [ ] Floating product screenshots/art, not generic cards.
  - [ ] Mouse-follow motion under reduced-motion guard.
- [ ] Template strip:
  - [ ] Five chunky cards: Websites, Mobile apps, Pitch decks, Forms, Proposals.
  - [ ] Each card uses high-fidelity product art.
  - [ ] Hover lift and "View templates" pill.
  - [ ] Scroll-snap on narrow screens.
- [ ] Black manifesto panel:
  - [ ] Huge headline.
  - [ ] Subtle gradient mesh.
  - [ ] No filler copy.
- [ ] Feature columns:
  - [ ] "Think it through."
  - [ ] "Design with intent."
  - [ ] "Ship anywhere."
  - [ ] Each has product screenshot or illustration.
- [ ] Community gallery:
  - [ ] Eight high-quality output thumbnails.
  - [ ] Creator names and avatars.
  - [ ] Card hover and keyboard focus.
- [ ] Testimonial:
  - [ ] Huge quote in GlideDesign display type.
  - [ ] Logo/name/avatar/role lockup.
  - [ ] Balanced whitespace at all widths.
- [ ] Pricing teaser:
  - [ ] Free / Pro $50 / Max $100.
  - [ ] Pro highlighted with subtle animated border.
- [ ] Final CTA:
  - [ ] Full-bleed mustard/coral panel.
  - [ ] Black oversized CTA.
  - [ ] Decorative geometry that feels intentional.
- [ ] Footer:
  - [ ] Logo, tagline, link columns, social row.
  - [ ] No stale Forge links.

## Phase 6 - Marketing Routes

- [ ] `/pricing`:
  - [ ] Monthly/annual toggle.
  - [ ] Free strict limits.
  - [ ] Pro $50 recommended.
  - [ ] Max $100.
  - [ ] Comparison table.
  - [ ] FAQ and tax/cap honesty.
- [ ] `/templates`:
  - [ ] Chunky gallery hero.
  - [ ] Filter chips.
  - [ ] 24-36 template cards.
  - [ ] Use-template CTAs.
- [ ] `/workflows` index:
  - [ ] Clear workflow taxonomy.
  - [ ] Product examples.
- [ ] `/workflows/contact-form`
- [ ] `/workflows/proposal`
- [ ] `/workflows/pitch-deck`
- [ ] `/workflows/[slug]`
- [ ] `/compare` index.
- [ ] `/compare/figma`
- [ ] `/compare/claude-design`
- [ ] `/compare/webflow`
- [ ] `/compare/canva`
- [ ] Existing `/compare/carrd`, `/compare/typeform`, and dynamic competitor pages.
- [ ] `/about`
- [ ] `/roadmap`
- [ ] `/help`
- [ ] `/blog`
- [ ] `/blog/*`
- [ ] `/press`
- [ ] `/terms`
- [ ] `/privacy`
- [ ] `/signin`
- [ ] `/signup`
- [ ] Every route:
  - [ ] metadata
  - [ ] OG image
  - [ ] mobile layout
  - [ ] keyboard focus
  - [ ] no old Forge copy

## Phase 7 - High-Fidelity Asset System

- [ ] Replace placeholder SVGs where they read as temporary.
- [ ] Create `apps/web/public/marketing/MANIFEST.json` entries for every asset:
  - [ ] filename
  - [ ] use surface
  - [ ] source prompt or native SVG note
  - [ ] status
  - [ ] iteration count
  - [ ] reviewer notes
- [ ] Hero product screenshot/art:
  - [ ] War Room composite
  - [ ] Canvas composite
  - [ ] Code/export composite
- [ ] Chunky card assets:
  - [ ] websites
  - [ ] mobile apps
  - [ ] pitch decks
  - [ ] forms
  - [ ] proposals
- [ ] Community thumbnails:
  - [ ] 8 homepage cards
  - [ ] creator avatars
- [ ] Templates gallery:
  - [ ] 24-36 diverse cards
- [ ] Workflow hero illustrations:
  - [ ] contact forms
  - [ ] proposals
  - [ ] pitch decks
  - [ ] landing pages
  - [ ] mobile apps
  - [ ] websites
- [ ] Empty-state illustrations:
  - [ ] dashboard
  - [ ] submissions
  - [ ] analytics
  - [ ] templates filter
  - [ ] memory
  - [ ] API tokens
  - [ ] webhooks
  - [ ] custom domains
  - [ ] billing invoices
  - [ ] audit log
- [ ] Error illustrations:
  - [ ] 404
  - [ ] 500
  - [ ] 503
  - [ ] 401
  - [ ] 403
- [ ] OG/social cards:
  - [ ] homepage
  - [ ] pricing
  - [ ] templates
  - [ ] each workflow
  - [ ] compare pages
  - [ ] about/help/roadmap/blog

## Phase 8 - App Shell And Navigation

- [ ] Sidebar:
  - [ ] Mark-only logo at top.
  - [ ] x.com-style bold nav labels and icons.
  - [ ] Oversized brand-gradient Create button.
  - [ ] Active violet-tint pill.
  - [ ] Collapsed state.
  - [ ] Workspace switcher.
  - [ ] Mobile bottom/nav equivalent.
- [ ] Top bar:
  - [ ] Oversized search with command hint.
  - [ ] Notifications with gradient unread dot.
  - [ ] Avatar menu.
  - [ ] Route-aware title or breadcrumbs where useful.
- [ ] Command palette:
  - [ ] Grouped actions.
  - [ ] Active result with violet tint.
  - [ ] Keyboard flow.
- [ ] Offline and loading skeletons:
  - [ ] GlideDesign styling.
  - [ ] No old Forge wording.
- [ ] App errors:
  - [ ] GlideDesign illustration and copy.

## Phase 9 - Dashboard

- [ ] Recents hero with chunky color panel.
- [ ] Recent page cards with real screenshots or polished placeholders.
- [ ] Grid/list toggle.
- [ ] Filters:
  - [ ] Recently viewed
  - [ ] Shared files
  - [ ] Shared projects
  - [ ] Live/draft/archive
  - [ ] Workflow type
- [ ] Empty dashboard illustration and CTA.
- [ ] Usage bar styled with brand gradient.
- [ ] Page cards:
  - [ ] screenshot area
  - [ ] status chip
  - [ ] unread count
  - [ ] actions menu
  - [ ] keyboard focus
- [ ] Ensure no inline styles that break token system.

## Phase 10 - Studio And War Room

- [ ] Route inventory:
  - [ ] `/studio`
  - [ ] `/studio/mobile`
  - [ ] `/studio/web`
  - [ ] `/studio/war-room/new`
  - [ ] `/studio/war-room/[project_id]`
- [ ] Feature flag defaults and redirects.
- [ ] Strategy pane:
  - [ ] goal editor
  - [ ] target user
  - [ ] core loop chain
  - [ ] metrics
  - [ ] memory chips
  - [ ] prompt/refine input
  - [ ] streaming agent status
- [ ] Canvas:
  - [ ] multi-frame preview
  - [ ] flow connectors
  - [ ] labels
  - [ ] marquee selection
  - [ ] element selection
  - [ ] gradient selection outline
  - [ ] overlays: Design, Flow, System, Heatmap, Logic
- [ ] System pane:
  - [ ] Data
  - [ ] States
  - [ ] Logic
  - [ ] Money
  - [ ] editable rules
- [ ] Stage navigation:
  - [ ] IDEA
  - [ ] SYSTEM
  - [ ] DESIGN
  - [ ] BUILD
  - [ ] GROW
  - [ ] URL sync
  - [ ] reduced-motion fallback
- [ ] Next Move strip:
  - [ ] one suggestion only
  - [ ] dismiss/cooldown
  - [ ] action handlers
- [ ] Action Dock:
  - [ ] max 5 visible actions
  - [ ] Deploy
  - [ ] Simulate
  - [ ] Improve onboarding
  - [ ] Add referral loop
  - [ ] Code handoff
- [ ] Simulate mode:
  - [ ] credit estimate
  - [ ] persona count by plan
  - [ ] heatmap chips
  - [ ] saved runs
  - [ ] honest synthetic-user disclaimer
- [ ] Multi-agent panel:
  - [ ] PM
  - [ ] Designer
  - [ ] Growth
  - [ ] Engineer
  - [ ] critique filters
  - [ ] short discuss flow
- [ ] Responsive behavior:
  - [ ] desktop four-pane
  - [ ] tablet drawer
  - [ ] phone tabs

## Phase 11 - In-App Page Surfaces

- [ ] `/pages`
- [ ] `/pages/[pageId]/overview`
- [ ] `/pages/[pageId]/submissions`
- [ ] `/pages/[pageId]/analytics`
- [ ] `/pages/[pageId]/share`
- [ ] `/pages/[pageId]/settings`
- [ ] `/app-templates`
- [ ] `/analytics`
- [ ] `/analytics/engagement`
- [ ] `/analytics/pipeline`
- [ ] `/help`
- [ ] `/help/shortcuts`
- [ ] For each:
  - [ ] header hierarchy
  - [ ] card/tables polish
  - [ ] empty state
  - [ ] error state
  - [ ] mobile layout
  - [ ] focus states

## Phase 12 - Settings

- [ ] Layout nav visual polish.
- [ ] `/settings/profile`
- [ ] `/settings/workspace`
- [ ] `/settings/brand`
- [ ] `/settings/team`
- [ ] `/settings/billing`
- [ ] `/settings/billing/plans`
- [ ] `/settings/usage`
- [ ] `/settings/privacy`
- [ ] `/settings/memory`
- [ ] `/settings/preferences/generation`
- [ ] `/settings/notifications`
- [ ] `/settings/integrations`
- [ ] `/settings/calendars`
- [ ] `/settings/studio`
- [ ] For each:
  - [ ] form labels
  - [ ] save affordance
  - [ ] destructive action treatment
  - [ ] success/error toast copy
  - [ ] locale/currency formatting where relevant

## Phase 13 - Billing, Credits, Stripe

- [ ] Verify plan names and prices:
  - [ ] Free
  - [ ] Pro $50/mo
  - [ ] Max $100/mo
  - [ ] annual discount
- [ ] Credit estimate components.
- [ ] Confirmation modal.
- [ ] Live balance update during generation.
- [ ] Spending cap alerts.
- [ ] Billing plans page.
- [ ] Invoices list.
- [ ] Refund flow.
- [ ] Tax info section.
- [ ] Value summary digest.
- [ ] Cancel/pause/downgrade flow.
- [ ] Admin billing overview.
- [ ] Stripe Checkout branding.
- [ ] Stripe portal branding.
- [ ] Webhook smoke checks.

## Phase 14 - Feedback And Memory

- [ ] Feedback strip component on every artifact kind.
- [ ] Structured feedback popover.
- [ ] Quick improve actions without emoji in product chrome where brand rules forbid it.
- [ ] Feedback API idempotency.
- [ ] Feedback-to-memory writes.
- [ ] Memory page:
  - [ ] categories
  - [ ] strength bars
  - [ ] edit dialog
  - [ ] scope switch
  - [ ] forget action
  - [ ] reset all
- [ ] Why-this-looks-this-way expansion.
- [ ] Version timeline drawer.
- [ ] Restore and compare.
- [ ] Admin patterns dashboard.
- [ ] Improvement loop worker report.

## Phase 15 - Public Pages

- [ ] Public route inventory.
- [ ] Public pages inherit user brand kit, not GlideDesign theme.
- [ ] Made with GlideDesign badge:
  - [ ] Free only
  - [ ] bottom-right
  - [ ] hover copy
  - [ ] Pro+ hidden
- [ ] Powered by GlideDesign footer.
- [ ] Default OG card.
- [ ] Print stylesheet:
  - [ ] proposals
  - [ ] decks
- [ ] Embed script naming and compatibility:
  - [ ] keep old script only if documented compatibility path
  - [ ] add GlideDesign-named script aliases if needed

## Phase 16 - Emails And Receipts

- [ ] Transactional email base template.
- [ ] Header logo.
- [ ] Button style.
- [ ] Footer links.
- [ ] Plain-text fallbacks.
- [ ] Confirmation email.
- [ ] Invitation email.
- [ ] Notification email.
- [ ] Billing receipt.
- [ ] Refund approval/denial.
- [ ] Spending cap alerts.
- [ ] Value summary.
- [ ] Weekly memory digest.
- [ ] Dark email client fallbacks.
- [ ] External client tests documented.

## Phase 17 - Admin And Internal

- [ ] `/admin/overview`
- [ ] `/admin/users`
- [ ] `/admin/orgs`
- [ ] `/admin/templates`
- [ ] `/admin/patterns`
- [ ] `/admin/orchestration-quality`
- [ ] `/admin/billing`
- [ ] `/admin/refunds`
- [ ] `/internal/design/tokens`
- [ ] `/internal/design/showcase`
- [ ] `/dev/design-system`
- [ ] `/dev/primitives`
- [ ] Ensure internal pages still feel like GlideDesign, not default admin UI.

## Phase 18 - Metadata, SEO, Sitemap, Robots

- [ ] `metadataBase` points to `https://glidedesign.ai`.
- [ ] Route-specific titles and descriptions.
- [ ] OG/Twitter metadata.
- [ ] Homepage JSON-LD.
- [ ] Sitemap includes marketing and public pages.
- [ ] Robots allows marketing/public and disallows app/admin/internal.
- [ ] PWA manifest updated.
- [ ] Old domain redirects documented.

## Phase 19 - Forbidden Copy Sweep

- [ ] Run `rg -i "forge|forge\\.app" apps docs infra scripts packages`.
- [ ] Review every match.
- [ ] Replace user-facing copy.
- [ ] Preserve compatible internal identifiers only with documented reason.
- [ ] Update forbidden-copy allowlist.
- [ ] Guard must fail for new user-facing Forge copy.
- [ ] Fix old filenames in public assets where they are user-visible.

## Phase 20 - Motion Sparkle

- [ ] Hero gradient mesh 60s loop.
- [ ] Hero entrance stagger.
- [ ] Template card hover.
- [ ] Pricing recommended-card gradient border.
- [ ] CTA hover/press.
- [ ] Sidebar active pill movement.
- [ ] Toggle switch motion.
- [ ] Toast stack motion.
- [ ] Dialog and drawer entry.
- [ ] Tab cross-fade.
- [ ] Studio streaming bar.
- [ ] Quality score reveal.
- [ ] UsageBar fill.
- [ ] Notification pulse.
- [ ] Reduced-motion disables decorative motion.

## Phase 21 - Accessibility

- [ ] Axe scan marketing routes.
- [ ] Axe scan app routes.
- [ ] Axe scan public pages.
- [ ] Keyboard walkthrough:
  - [ ] signup
  - [ ] onboarding
  - [ ] dashboard
  - [ ] studio
  - [ ] publish
  - [ ] public page
  - [ ] settings
  - [ ] billing
- [ ] Screen-reader labels.
- [ ] Focus rings.
- [ ] Skip link.
- [ ] Dialog focus traps.
- [ ] Form labels and `aria-describedby`.
- [ ] Reduced-motion walkthrough.

## Phase 22 - Performance

- [ ] Production build.
- [ ] Lighthouse homepage.
- [ ] Lighthouse pricing.
- [ ] Lighthouse templates.
- [ ] Lighthouse dashboard.
- [ ] Lighthouse Studio.
- [ ] Lighthouse public page.
- [ ] Bundle budgets:
  - [ ] marketing < 80KB gz target
  - [ ] dashboard < 200KB gz target
  - [ ] studio < 350KB gz target
  - [ ] public page < 25KB gz target
- [ ] Image optimization.
- [ ] Font loading.
- [ ] CLS inspection.
- [ ] Document results in `docs/benchmarks/LIGHTHOUSE_GLIDEDESIGN.md`.

## Phase 23 - Visual Regression

- [ ] Capture baselines:
  - [ ] 1440px
  - [ ] 1024px
  - [ ] 768px
  - [ ] 375px
- [ ] Routes:
  - [ ] homepage
  - [ ] pricing
  - [ ] templates
  - [ ] workflow pages
  - [ ] compare pages
  - [ ] dashboard
  - [ ] Studio/War Room
  - [ ] pages list/detail
  - [ ] settings tabs
  - [ ] admin
  - [ ] public page
  - [ ] error pages
- [ ] Store in `apps/web/design/regression/glidedesign-baseline-v1/`.
- [ ] Add README with date and rationale.
- [ ] CI visual comparison threshold 2%.

## Phase 24 - Fresh-Eyes And Cohesion

- [ ] Fresh-eyes walkthrough:
  - [ ] signup
  - [ ] onboarding
  - [ ] generate
  - [ ] edit
  - [ ] publish
  - [ ] submission
  - [ ] reply
  - [ ] settings
  - [ ] 404
  - [ ] help
- [ ] Record top 5-10 issues.
- [ ] Fix top issues.
- [ ] Five-second homepage test with 5 people.
- [ ] Screenshot test: identify 5 surfaces worth posting publicly.
- [ ] Cohesion walk from marketing to billing/admin/public pages.

## Phase 25 - Documentation And Reports

- [ ] `docs/brand/GLIDEDESIGN_IDENTITY.md`
- [ ] `docs/brand/COLOR_SYSTEM.md`
- [ ] `docs/brand/TYPOGRAPHY.md`
- [ ] `docs/brand/LOGO_USAGE.md`
- [ ] `docs/runbooks/DOMAIN_SETUP.md`
- [ ] `docs/runbooks/VISUAL_REGRESSION.md`
- [ ] `docs/launch/GLIDEDESIGN_LAUNCH_CHECKLIST.md`
- [ ] `docs/missions/MISSION-GD-01-REPORT.md`
- [ ] `docs/missions/MISSION-GD-02-REPORT.md`
- [ ] Update root README public-facing brand.
- [ ] Update architecture/user/runbook docs where customer-facing or launch-facing.

## Immediate Next Fixes

- [ ] Bring Docker stack back up.
- [ ] Fix dark-mode token override that reintroduces Forge workshop palette.
- [ ] Fix mojibake in homepage and shared marketing copy.
- [ ] Replace homepage placeholder art with real SVG/raster asset references.
- [ ] Wire asset manifest to homepage cards.
- [ ] Run typecheck/lint/copy-check after the first pass.
