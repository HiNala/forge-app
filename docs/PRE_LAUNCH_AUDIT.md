# Forge Pre-Launch Audit

**Date:** 2026-04-28  
**Scope:** UI audit, technical audit, application behavior audit, user experience audit, security audit, code quality audit, mission completeness audit, and launch-readiness audit.  
**Verdict:** Forge is not ready for unrestricted paying-user launch yet. It is close enough for a tightly scoped private alpha or founder-led pilot if expectations are constrained to the currently working workflows, but the V2 mission promise is broader than the shipped behavior in several launch-critical areas.

## North Star

Forge should be the fastest way to turn plain English into a polished, hosted, measurable mini-app: forms, landing pages, proposals, pitch decks, mobile screens, and website prototypes. A user should be able to describe what they want, edit precise regions, publish or export cleanly, understand usage and billing before surprises happen, and trust that security, payments, observability, and support are production-grade.

The launch bar from the mission set is:

- A crisp mini-app platform positioning across marketing, onboarding, app surfaces, and email.
- Mobile and web design canvases with direct manipulation, region refinement, persistence, and exports.
- Session-based Forge Credits with weekly caps, honest usage bars, extra usage, Stripe plan changes, and admin provider routing.
- Canvas-aware AI orchestration across single pages, multi-page sites, mobile flows, multimodal inputs, and region edits.
- A template/workflow suite broad enough to justify the mini-app platform claim.
- Handoff exports that are real contracts, not roadmap labels.
- Calm, professional, Claude-quality UI polish across marketing, app, public pages, settings, analytics, and error states.
- Operational readiness: health checks, backups, deployment confirmation, Sentry, metrics, runbooks, on-call, and production secrets.

## Source Paths Reviewed

- Mission and launch docs: `docs/LAUNCH_CHECKLIST.md`, `docs/README.md`, `docs/V2_P01_STRATEGIC_REFRAME.md`, `docs/V2_P02_MOBILE_APP_CANVAS.md`, `docs/V2_P03_WEB_CANVAS.md`, `docs/V2_P04_PRICING_CREDITS_RATE_LIMITS.md`, `docs/V2_P05_CANVAS_ORCHESTRATION.md`, `docs/V2_P07_HANDOFF_EXPORTS.md`, `docs/V2_P09_UI_POLISH_CLAUDE_QUALITY.md`, `docs/V2_P10_CATCH_ALL.md`, `docs/plan/IMPLEMENTATION_STATUS.md`, `docs/plan/ui/FRONTEND_STATUS.md`.
- Frontend surfaces: `apps/web/src/app`, `apps/web/src/components`, `apps/web/src/lib`, `apps/web/src/hooks/use-shortcuts.ts`, `apps/web/src/styles/tokens.css`.
- Backend surfaces: `apps/api/app/api/v1`, `apps/api/app/services`, `apps/api/app/db/models`, `apps/api/alembic/versions`, `apps/api/tests`.
- Worker, deployment, and operations: `apps/worker/worker.py`, `.github/workflows`, `docker-compose*.yml`, `apps/*/railway.json`, `docs/runbooks`, `.env.example`.

## Severity Model

- **P0:** Launch blocker for real paying users.
- **P1:** Must fix before broad public launch or paid self-serve activation.
- **P2:** Important before scale, but can be sequenced behind a controlled launch.
- **P3:** Polish, consistency, or documentation improvement.

## Executive Findings

### P0: Do Not Launch Self-Serve Paid Traffic Until Commercial Flows Are Real

**North star objective:** Users can upgrade, downgrade, enable extra usage, see accurate limits, and trust Forge not to surprise them or leak money.

Findings:

- `apps/api/app/api/v1/billing.py` has `/billing/plan/upgrade`, `/billing/plan/downgrade`, and `/billing/plan/downgrade/cancel` returning `501`.
- `apps/api/app/services/billing/credits.py` implements session and weekly credit checks, ledger writes, and extra-usage counters, but there is no visible Stripe metered usage submission or period reset worker.
- `apps/api/app/db/models/scheduled_plan_change.py` exists, but downgrade scheduling is not wired to the API.
- `apps/api/app/services/billing/credits.py` has no concurrency-cap enforcement despite V2-P04 requiring per-tier simultaneous generation limits.
- `.env.example` still includes legacy `STRIPE_PRICE_STARTER`, while V2-P04 requires Free / Pro / Max 5x / Max 20x pricing.
- `apps/web/src/app/(app)/settings/usage/page.tsx` exposes usage and extra-usage state, but the surrounding billing controls are not complete enough for user trust.

Required fixes:

- Replace plan-change stubs with Stripe subscription update and scheduled downgrade flows.
- Add extra-usage Stripe metered usage reporting, billing-period reset, audit trail, and tests.
- Add per-tier concurrency enforcement before model execution.
- Normalize plan slugs, price IDs, and UI copy to Free / Pro / Max.
- Add end-to-end tests for checkout, upgrade, downgrade, cancel downgrade, overage cap, and exhausted-credit states.

### P0: Published Public Pages Can Break Because The API URL Is Constructed Incorrectly

**North star objective:** Every published mini-app URL loads reliably in production.

Findings:

- `.env.example` documents `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`.
- `apps/web/src/lib/api.ts` correctly accepts env values with or without `/api/v1`.
- `apps/web/src/app/(public)/p/[org]/[slug]/page.tsx` does not use `getApiUrl()` and appends `/api/v1` manually, producing `/api/v1/api/v1/public/pages/...` when the documented env value is used.

Required fixes:

- Use `getApiUrl()` or a dedicated public API URL helper in `apps/web/src/app/(public)/p/[org]/[slug]/page.tsx`.
- Add a regression test for both env forms: host-only and host-with-`/api/v1`.
- Smoke test published pages with production-like env values.

### P0: Mobile And Web Canvas Missions Are Visible But Not Product-Complete

**North star objective:** A user can choose mobile or web canvas, generate real AI output, persist it, region-edit it, publish/export it, and return later without losing work.

Findings:

- `apps/web/src/app/(app)/studio/mobile/page.tsx` and `apps/web/src/app/(app)/studio/web/page.tsx` render canvas-first surfaces, but their comments explicitly say chat and orchestration wiring can extend them.
- `apps/web/src/components/mobile-canvas/mobile-canvas-store.ts` seeds two local demo screens with static HTML and stores state in client memory.
- `apps/web/src/components/web-canvas/web-canvas-store.ts` seeds one local demo page and stores pages, nav, paths, theme, and flow edges in client memory.
- `apps/api/app/services/workflows/registry.py` routes `mobile_app` and `website` to `composer_key="generic"` with `page_type=None`; this does not satisfy the V2-P02/P03 dedicated mobile and website composer objectives.
- `apps/api/app/services/export/catalog.py` marks the promised canvas exports (`figma`, `expo_project`, `html_prototype`, `png_screens`, `html_zip`, `nextjs_project`, `framer_json`, `webflow_json`) as `implemented=False`.
- `apps/api/app/services/orchestration/scope.py` and `apps/api/app/services/orchestration/region_hash.py` define scope and drift primitives, but the production path is still largely heuristic and not a full persisted region-edit graph.

Required fixes:

- Add persisted project/page/screen data models for canvas artifacts.
- Wire `/studio/mobile` and `/studio/web` to AI generation, streaming, save/load, undo/redo, and publish/export flows.
- Add dedicated mobile and website composers and prompts.
- Add real region-edit endpoints for element, region, screen, flow, and project scope.
- Add Playwright coverage for generate, marquee-select, refine, save, reload, publish, and export.

### P0: Handoff Exports Are Mostly A Catalog, Not A Launch-Ready Contract

**North star objective:** Every advertised export format either works or is removed from user-facing promises until it works.

Findings:

- `apps/api/app/services/workflows/registry.py` advertises many export formats across workflows.
- `apps/api/app/services/export/catalog.py` marks most of the high-value formats as `implemented=False`.
- `apps/api/app/services/export/service.py` returns real output for a narrow set: `html_static`, `hosted`, CSV-style exports, `embed_iframe`, `webhook_snippet`, `domain_handoff_txt`, queued deck PDF/PPTX, and proposal PDF route pointers.
- `apps/api/app/services/export/service.py` returns `"This export is not available yet (roadmap)."` for many mission-critical promises.
- `apps/api/app/services/export/service.py` swallows deck export queue exceptions and still returns `export_completed`, which can create false success analytics.

Required fixes:

- Decide which export formats are launch promises and hide the rest behind internal flags or explicit roadmap pages.
- Add adapter implementations or remove user-facing cards for `figma`, `expo_project`, `nextjs_project`, `html_zip`, `framer_json`, `webflow_json`, `docx`, `google_doc`, `google_slides`, `qr_png`, `typeform_json`, and similar planned formats.
- Do not emit `export_completed` when queueing fails.
- Add export quality validators for all shipped formats.

### P0: Launch Checklist Is Not Satisfied

**North star objective:** Production launch is boring: healthy services, verified secrets, backups, webhooks, DNS, TLS, Sentry, legal pages, support, on-call, and runbooks.

Findings:

- `docs/LAUNCH_CHECKLIST.md` has every technical, product/legal, operational, and sign-off checkbox empty.
- `apps/api/app/main.py` has `/health/ready` for Postgres and Redis, but the V2 catch-all requires deeper checks for LLM providers, Stripe, Resend, Google Calendar, and other external dependencies.
- `.env.example` defaults `TRUSTED_HOSTS=*`; this is dangerous if copied into production.
- `.env.example` includes placeholder secrets and provider keys but no machine-enforced launch gate.
- `.github/workflows/deploy-production.yml` exists, but this audit did not verify manual production approval, environment protection, or secret completeness.

Required fixes:

- Convert `docs/LAUNCH_CHECKLIST.md` into a signed launch gate with owners and dates.
- Add `/health/deep` or an equivalent admin-only dependency probe.
- Run and document `scripts/deployment/audit_env.sh production` or an equivalent secret audit.
- Verify Stripe live webhooks, Resend, OAuth redirect URIs, Sentry DSNs, backups, DNS, TLS, and manual deploy approvals.

## UI Audit

### P1: The Product Positioning Is Partially Reflected, But Old Category Language Remains

**North star objective:** A new visitor understands in five seconds that Forge is a mini-app platform.

Findings:

- `docs/V2_P01_STRATEGIC_REFRAME.md` requires “mini-app platform” language across every surface.
- `apps/web/src/app/(marketing)/page.tsx` uses the new positioning in metadata and hero copy.
- `apps/api/app/main.py` still describes the backend as `AI page builder`.
- Some code and docs still refer to page-builder concepts. That may be fine internally, but user-facing strings should be swept.

Required fixes:

- Run a forbidden-copy scan for “AI page builder” and old plan names across app, email, marketing, docs, and OpenAPI descriptions.
- Update backend OpenAPI description if external developers or admins see it.

### P1: Settings Integrations Surface Shows Multiple Coming-Soon Items In A Paid-User Area

**North star objective:** No half-wired features appear as if they are part of the paid product.

Findings:

- `apps/web/src/app/(app)/settings/integrations/page.tsx` shows Apple Calendar, Slack, Zapier, and Custom webhooks as disabled “Coming soon”.
- `docs/V2_P10_CATCH_ALL.md` explicitly says no orphaned features or coming-soon buttons should remain unless intentionally roadmapped.
- `apps/api/app/api/v1/calendar.py` returns “Apple Calendar connection is not implemented yet.”

Required fixes:

- Hide unimplemented integrations for paid launch or move them to a public roadmap panel.
- If custom webhooks are advertised as export/handoff functionality, wire them or remove the promise.

### P1: UsageBar Is A Strong Start, But Billing UX Is Not Complete Around It

**North star objective:** Usage limits feel predictable and honest before a user hits the wall.

Findings:

- `apps/web/src/components/usage/UsageBar.tsx` implements an accessible progress bar with reduced-motion handling.
- `apps/web/src/app/(app)/settings/usage/page.tsx` shows current session, weekly limit, plan resources, extra usage, and token detail.
- Pre-action warnings, cost estimates, concurrency queues, “adjust limit” flows, and generation-completion transparency are not fully connected across Studio.
- `apps/web/src/app/(app)/settings/usage/page.tsx` hardcodes USD display for extra usage, which conflicts with the V2-P10 localization and currency foundations.

Required fixes:

- Show pre-action credit estimates before generation and region edits.
- Ensure `credit.charged` updates all relevant usage bars immediately.
- Use localized currency formatting.
- Add tests for warning, exhausted, extra-usage, and reset states.

### P2: Canvas UI Has Good Visual Primitives But Needs Workflow Completion

**North star objective:** The canvas should feel like a direct manipulation design tool, not a demo surface.

Findings:

- `apps/web/src/components/mobile-canvas/mobile-canvas.tsx` and `apps/web/src/components/web-canvas/web-canvas.tsx` use `@xyflow/react`, minimap, zoom, pan, dot grid, toolbar, and marquee mode.
- `apps/web/src/components/mobile-canvas/phone-screen-node.tsx` and `apps/web/src/components/web-canvas/browser-frame-node.tsx` provide the visual node surfaces.
- The stores are local, demo-initialized, and not integrated with the main Studio chat flow or backend persistence.

Required fixes:

- Add empty, loading, generating, failed, saved, and offline states.
- Add persistence status and autosave affordances.
- Add right-side chat or prompt affordance so the canvas is not disconnected from Forge’s core text-to-design loop.

## Technical Audit

### P1: AI Provider Routing Has Two Parallel Concepts And Some Stubbed Adapters

**North star objective:** Admin can switch providers and models without users seeing provider complexity.

Findings:

- `apps/api/app/services/ai/router.py` uses LiteLLM and supports fallback chains.
- `apps/api/app/services/llm/llm_router.py` supports role-based structured completions and routing config.
- `apps/api/app/services/ai/openai_provider.py` and `apps/api/app/services/ai/gemini_provider.py` are explicit stubs that raise `NotImplementedError`.
- `apps/api/app/services/llm/llm_router.py` only maps `intent_parser`, `composer`, `section_editor`, `voice_inferrer`, and `reviewer`; V2-P04/P05 expects mobile composer, web composer, refiner, reviewer, and future provider roles.
- `apps/api/app/services/ai/router.py` logs `cost_cents` as `None` even though it calculates a cost in metadata.

Required fixes:

- Consolidate provider abstraction documentation so engineers know LiteLLM is the production path and stub adapters are not active.
- Add roles for mobile, web, website, region refiner, project transform, and multimodal extraction.
- Fix LLM metric logging to emit calculated cost.
- Add admin-routing end-to-end tests that verify the next call uses the selected route.

### P1: Multimodal Input Is Registered But Feature Extraction Is Stubbed

**North star objective:** Uploaded screenshots, brand boards, and PDFs meaningfully influence generation.

Findings:

- `apps/api/app/api/v1/studio.py` supports attachment presign and registration.
- `apps/api/app/services/vision/extract.py` returns hardcoded `dominant_colors`, `style_guess`, and `ocr_text=None`.
- `apps/api/app/services/context/gather.py` is prepared to include vision inputs, but the extraction quality does not meet V2-P05.

Required fixes:

- Add async extraction worker for images and PDFs.
- Route vision-required calls to vision-capable models.
- Add OCR, dominant colors, layout description, and safe-reference safeguards.
- Add multimodal eval fixtures and regression tests.

### P1: Clarification And Plan Continuation Are Not Wired

**North star objective:** AI should clarify ambiguity without blocking output, and the user should be able to continue from that clarification.

Findings:

- `apps/api/app/services/orchestration/pipeline.py` can emit `clarify` SSE events when intent confidence is low.
- `apps/api/app/api/v1/studio.py` has `/studio/generate/continue` returning `501`.
- `docs/V2_P05_CANVAS_ORCHESTRATION.md` requires continuation for workflow, scope, breakpoint, and reference ambiguity.

Required fixes:

- Implement continuation state and graph re-entry.
- Add frontend click handling for clarify chips that calls a working endpoint.
- Add tests for clarify choices changing subsequent output.

### P2: Region Drift Detection Is Heuristic

**North star objective:** Region-scoped edits only change the selected elements.

Findings:

- `apps/api/app/services/orchestration/region_hash.py` hashes rough HTML chunks by scanning `data-forge-section` and `data-forge-element`.
- The function takes the next 12,000 characters as a subtree proxy rather than parsing a DOM or component tree.
- V2-P02/P05 acceptance criteria require validator-backed byte-identical preservation outside the region.

Required fixes:

- Move region edits to structured component-tree diffs where possible.
- Parse HTML structurally for fallback paths.
- Add synthetic drift tests for outside-region mutation, deletion, reordering, and attribute-only changes.

### P2: Worker Contains Several Launch-Relevant Stubs

**North star objective:** Background jobs for emails, calendars, screenshots, billing, exports, and cleanup are reliable.

Findings:

- `apps/worker/worker.py` returns `"stub"` for `calendar_create_event`, `page_screenshot`, and `ai_cost_aggregate`.
- `apps/worker/worker.py` references proposal PDF placeholder assignment.
- `docs/plan/IMPLEMENTATION_STATUS.md` already notes automations reliability and worker gaps.

Required fixes:

- Finish or hide workflows that depend on these workers.
- Add retry, idempotency, queue-depth monitoring, and failure alerts.
- Add production runbook checks for worker liveness.

## Application Behavior Audit

### P1: Public Page Runtime Needs A Security And Reliability Pass

**North star objective:** Public mini-apps are safe, fast, and consistent because they are the second thing prospects see.

Findings:

- `apps/web/src/app/(public)/p/[org]/[slug]/page.tsx` renders generated HTML with `srcDoc`.
- The public iframe uses `sandbox="allow-same-origin allow-forms allow-popups allow-modals allow-scripts"`.
- `apps/api/app/services/orchestration/html_validate.py` rejects scripts and `javascript:` URLs for generated and published pages, which mitigates risk.
- The combination of `allow-scripts` and `allow-same-origin` still deserves a careful security review because any missed script injection becomes more powerful.

Required fixes:

- Reassess whether public pages need both `allow-scripts` and `allow-same-origin`.
- Add CSP headers for public routes.
- Add tests proving generated/published HTML cannot include scripts, event-handler attributes, `javascript:` links, hostile forms, or unsandboxed embeds.

### P1: Export Analytics Can Report False Success

**North star objective:** Monitoring tells the truth so failed handoffs are visible.

Findings:

- `apps/api/app/services/export/service.py` catches exceptions from `enqueue_deck_export` and still emits `export_completed`.
- The user receives a queued response even if queueing failed.

Required fixes:

- Emit `export_failed` if queueing fails.
- Surface retry guidance to the user.
- Add worker enqueue tests for deck PDF/PPTX and proposal PDF.

### P2: Custom Domain Delete Is Not Audit-Logged

**North star objective:** Every meaningful mutation has actor, resource, diff, IP, user agent, and timestamp.

Findings:

- `apps/api/app/api/v1/settings_surfaces.py` writes audit logs when adding a custom domain.
- The same file revokes custom domains without writing an audit log.
- `docs/V2_P10_CATCH_ALL.md` requires custom domain changes in the audit log.

Required fixes:

- Audit-log delete/revoke, verify, attach/detach, and status changes for custom domains.
- Sweep all settings mutations against V2-P10’s audit-log list.

### P2: Monthly Quotas And Forge Credits Coexist But Need Product Clarity

**North star objective:** The user understands the one true limit model.

Findings:

- `apps/api/app/services/ai/usage.py` still enforces monthly page-generation quotas via `check_quota`.
- `apps/api/app/services/billing/credits.py` enforces session and weekly Forge Credits.
- `apps/web/src/app/(app)/settings/usage/page.tsx` shows both plan resources and Forge Credits.

Required fixes:

- Decide which limits are user-facing per tier and name them consistently.
- Ensure 402 payloads distinguish monthly resource cap, session cap, weekly cap, and extra-usage cap.
- Add copy to explain how monthly published mini-apps differ from credits.

## User Experience Audit

### P1: Launch UX Still Has Half-Wired Or Roadmap Surfaces

**North star objective:** A user never clicks into a promise that immediately says “not implemented”.

Findings:

- `apps/web/src/app/(app)/settings/integrations/page.tsx` contains disabled coming-soon cards.
- `apps/api/app/api/v1/billing.py` contains user-reachable plan-change stubs.
- `apps/api/app/api/v1/studio.py` contains continuation stubs.
- `apps/api/app/services/export/catalog.py` exposes many planned formats.

Required fixes:

- Add feature flags for unimplemented surfaces.
- Hide or clearly label roadmap items outside the paid product workflow.
- Add a “launch surface inventory” test or checklist for buttons that route to 404/501/not implemented.

### P2: Keyboard Shortcuts Cover App Navigation But Not Full Studio/Canvas Editing

**North star objective:** Power users can move through Forge quickly and recover from mistakes.

Findings:

- `apps/web/src/hooks/use-shortcuts.ts` implements global chord navigation, `?`, and sidebar toggle.
- Canvas pages add `M` for marquee.
- V2-P10 asks for Studio undo/redo, submit, preview toggle, save comfort shortcut, form-builder shortcuts, dashboard row navigation, and Escape-close guarantees.

Required fixes:

- Add Studio/canvas-specific shortcut layer and help docs.
- Add undo/redo for destructive and editing flows.
- Add tests for shortcuts not firing inside inputs.

### P2: Localization And Currency Foundations Are Not Complete

**North star objective:** User-facing date, money, and number formatting is correct and future-localizable.

Findings:

- `apps/web/src/app/(app)/settings/usage/page.tsx` uses `$${...} (USD)` strings directly.
- Several UI paths use raw `toLocaleString()` without visible locale plumbing.
- V2-P10 requires translation functions and locale-aware formatting foundations.

Required fixes:

- Add currency and date formatting helpers based on user/org locale and currency.
- Move billing and usage copy through centralized formatting utilities.

## Security Audit

### P0/P1: Production Defaults Need Hard Gates

**North star objective:** Production cannot accidentally run with development security posture.

Findings:

- `.env.example` includes `TRUSTED_HOSTS=*`.
- `.env.example` includes placeholder secrets and local service defaults.
- `apps/api/app/config.py` validates one known development `SECRET_KEY` placeholder, but production launch needs a broader environment audit.
- `docs/LAUNCH_CHECKLIST.md` requires a secrets audit before production traffic.

Required fixes:

- Make production startup fail if `TRUSTED_HOSTS=*`, weak secret values, missing webhook secrets, missing Clerk settings, or missing Sentry DSNs are present.
- Add documented production env manifest validation.
- Ensure deployment workflows run env audits before deploy.

### P1: Public HTML Sandbox And CSP Need Formal Threat Modeling

**North star objective:** Generated customer content cannot execute privileged code or escape isolation.

Findings:

- `apps/web/src/app/(public)/p/[org]/[slug]/page.tsx` allows scripts and same-origin inside sandboxed `srcDoc`.
- `apps/web/src/components/studio/studio-workspace.tsx` uses an iframe sandbox with forms, same-origin, and scripts for live preview.
- `apps/api/app/services/orchestration/html_validate.py` blocks scripts and `javascript:` URLs, but security should not rely on one regex validator.

Required fixes:

- Add CSP at app and public-page layers.
- Add sanitization or structural validation beyond regex for generated HTML.
- Review whether preview and public runtime need different sandbox permissions.
- Add security tests for script injection, handler attributes, external embeds, malicious forms, and link targets.

### P1: Metrics Endpoint Depends On Runtime Token Discipline

**North star objective:** Operational telemetry is available to operators but not exposed to the public.

Findings:

- `apps/api/app/main.py` exposes `/metrics`; it is gated only when `METRICS_TOKEN` is set.
- `.env.example` leaves `METRICS_TOKEN` empty.

Required fixes:

- Make production startup require `METRICS_TOKEN`.
- Verify Prometheus or hosting provider scrape configuration uses bearer auth.

## Code Quality Audit

### P1: Stubs And Placeholders Remain In Production Paths

**North star objective:** The codebase should not contain launch-visible stubs except behind explicit feature flags.

Findings:

- `apps/api/app/api/v1/billing.py` has billing stubs.
- `apps/api/app/api/v1/studio.py` has continuation stubs.
- `apps/api/app/services/vision/extract.py` has stub extraction.
- `apps/api/app/services/ai/openai_provider.py` and `apps/api/app/services/ai/gemini_provider.py` are stub classes.
- `apps/worker/worker.py` has worker stubs.
- `apps/web/src/app/(app)/settings/integrations/page.tsx` has coming-soon cards.

Required fixes:

- Triage every stub as: ship now, flag/hide, or delete.
- Add CI checks for `NotImplementedError`, `stub`, and user-facing “Coming soon” outside allowlisted files.

### P2: Export Format Registry Is Ahead Of Implementation

**North star objective:** Registries describe working product truth, not aspirational scope.

Findings:

- `apps/api/app/services/workflows/registry.py` lists many formats for each workflow.
- `apps/api/app/services/export/catalog.py` marks many as unimplemented.
- This split can make the UI look broader than the product actually is.

Required fixes:

- Add a launch-mode filter that only returns implemented formats.
- Keep roadmap formats in docs or admin-only views.

### P2: Tests Exist But Need Launch-Critical Coverage Added

**North star objective:** The riskiest money, publish, export, auth, and canvas flows are covered before launch.

Current evidence:

- API tests cover many areas under `apps/api/tests`, including LLM router, P05 orchestration, RLS, rate limits, team security, and user flows.
- Web tests exist under `apps/web/src/**/*.test.ts`, `apps/web/e2e`, and `apps/web/tests/e2e`.
- Docs in `docs/plan/IMPLEMENTATION_STATUS.md` say previous API and web checks have passed, but the audit did not rerun them.

Missing/high-priority coverage:

- Published public page URL env regression.
- Stripe checkout, upgrade, downgrade, cancel downgrade, webhook idempotency, and extra usage.
- Canvas generate/save/reload/refine/export.
- Export queue failure and success analytics.
- Public iframe security and generated HTML sanitization.
- Deep health, worker queue, and production env validation.

## Mission Completeness Audit

### V2-P01 Strategic Reframe

**Status:** Partial.

Paths:

- `docs/V2_P01_STRATEGIC_REFRAME.md`
- `apps/web/src/app/(marketing)/page.tsx`
- `apps/web/src/lib/copy/index.ts`
- `apps/api/app/main.py`

Gaps:

- Marketing homepage reflects mini-app positioning.
- Backend/OpenAPI and some legacy references still say page builder.
- Need copy sweep across app, docs, email templates, OpenAPI, and settings.

### V2-P02 Mobile App Canvas

**Status:** Visual substrate exists; end-to-end workflow not launch-complete.

Paths:

- `apps/web/src/app/(app)/studio/mobile/page.tsx`
- `apps/web/src/components/mobile-canvas/mobile-canvas.tsx`
- `apps/web/src/components/mobile-canvas/mobile-canvas-store.ts`
- `apps/web/src/components/mobile-canvas/phone-screen-node.tsx`
- `apps/api/app/services/workflows/registry.py`
- `apps/api/app/services/export/catalog.py`

Gaps:

- No persisted mobile project model visible.
- No dedicated mobile composer in the registry.
- No real Figma/Expo/HTML prototype/PNG export.
- No complete region-edit graph for mobile screens.

### V2-P03 Web Canvas

**Status:** Visual substrate exists; multi-page AI website workflow not launch-complete.

Paths:

- `apps/web/src/app/(app)/studio/web/page.tsx`
- `apps/web/src/components/web-canvas/web-canvas.tsx`
- `apps/web/src/components/web-canvas/web-canvas-store.ts`
- `apps/web/src/components/web-canvas/browser-frame-node.tsx`
- `apps/api/app/services/workflows/registry.py`
- `apps/api/app/services/export/catalog.py`

Gaps:

- No persisted multi-page website artifact visible.
- `website` uses generic composer metadata.
- Major exports are disabled.
- Site-wide style sync is local-state only, not integrated with backend publish/export.

### V2-P04 Pricing, Credits, Rate Limits

**Status:** Credit accounting core exists; commercial system incomplete.

Paths:

- `apps/api/app/services/billing/credits.py`
- `apps/api/app/services/billing/credit_windows.py`
- `apps/api/app/api/v1/billing.py`
- `apps/web/src/components/usage/UsageBar.tsx`
- `apps/web/src/app/(app)/settings/usage/page.tsx`
- `apps/api/alembic/versions/p04_forge_credits_ledger_v2.py`

Gaps:

- Plan changes are stubbed.
- Extra usage is not visibly submitted to Stripe.
- Concurrency caps are not enforced.
- Migration from Starter/Enterprise to Free/Max needs production proof.

### V2-P05 Canvas-Aware Orchestration

**Status:** Foundational types exist; full orchestration is partial.

Paths:

- `apps/api/app/services/orchestration/scope.py`
- `apps/api/app/services/orchestration/region_hash.py`
- `apps/api/app/services/orchestration/pipeline.py`
- `apps/api/app/api/v1/studio.py`
- `apps/api/app/services/vision/extract.py`
- `apps/api/app/services/llm/llm_router.py`

Gaps:

- Continuation endpoint is `501`.
- Multimodal extraction is stubbed.
- Region drift validation is heuristic.
- Model roles do not cover every V2 composer and refiner.

### V2-P06 Template Suite

**Status:** Registry and workflow metadata are broad; verify runtime completeness before launch.

Paths:

- `apps/api/app/services/workflows/registry.py`
- `apps/api/app/services/orchestration/composer/specialized.py`
- `apps/api/app/services/llm/prompts/composers`
- `apps/web/src/app/(app)/templates/page.tsx`
- `apps/web/src/lib/workflow-landings.ts`

Gaps:

- Need manual QA for every workflow: generate, publish, submit, analytics, export visibility, and empty state.
- Need confirm template seed API/E2E is not placeholder-only.

### V2-P07 Handoff Exports

**Status:** Not launch-complete.

Paths:

- `apps/api/app/services/export/service.py`
- `apps/api/app/services/export/catalog.py`
- `apps/api/app/services/workflows/registry.py`
- `apps/web/src/app/(marketing)/handoff/page.tsx`

Gaps:

- Most promised exports are roadmap.
- Queue failure can be misreported as success.
- No visible quality validator suite for all advertised formats.

### V2-P08 Competitor Parity

**Status:** Marketing/category work exists; functional parity still needs proof.

Paths:

- `docs/V2_P08_COMPETITOR_PARITY_TEMPLATES.md`
- `apps/web/src/app/(marketing)/compare`
- `apps/web/src/lib/workflow-landings.ts`
- `apps/api/app/services/workflows/registry.py`

Gaps:

- Competitor parity claims should be mapped to working features only.
- Functional parity for Typeform/Tally/Carrd/Linktree/Calendly alternatives requires end-to-end proof.

### V2-P09 UI Polish

**Status:** Partial.

Paths:

- `apps/web/src/styles/tokens.css`
- `apps/web/src/components/usage/UsageBar.tsx`
- `apps/web/src/app/(app)/internal/design/tokens/page.tsx`
- `apps/web/src/app/(app)/settings/usage/page.tsx`
- `apps/web/src/components/chrome/sidebar.tsx`

Gaps:

- UsageBar is strong.
- Need route-by-route accessibility, density, empty-state, dark-mode, and public-page polish proof.
- Need Lighthouse and authenticated axe sweep evidence.

### V2-P10 Catch-All

**Status:** Open.

Paths:

- `docs/V2_P10_CATCH_ALL.md`
- `apps/web/src/hooks/use-shortcuts.ts`
- `apps/web/src/app/not-found.tsx`
- `apps/web/src/components/chrome/not-found-help.tsx`
- `apps/api/app/api/v1/settings_surfaces.py`
- `apps/worker/worker.py`

Gaps:

- Stubs and coming-soon surfaces remain.
- Undo/redo is not complete across destructive actions.
- Audit log completeness needs a sweep.
- Deep health and backup drill proof remain launch tasks.

## Recommended Mission Breakdown

### Mission 1: Public Page Reliability And Security Gate

North star objective: every published URL loads and is safely isolated.

Scope:

- Fix `apps/web/src/app/(public)/p/[org]/[slug]/page.tsx` API URL construction.
- Add regression tests around `NEXT_PUBLIC_API_URL`.
- Review iframe sandbox permissions in public and Studio preview.
- Add CSP and generated HTML security tests.

### Mission 2: Billing And Credits Launch Completion

North star objective: paid users can upgrade, downgrade, use credits, and opt into overage without surprises.

Scope:

- Wire plan upgrade/downgrade/cancel endpoints.
- Implement extra-usage Stripe metered billing and period reset.
- Enforce concurrency caps.
- Normalize Free / Pro / Max price IDs.
- Add billing E2E tests.

### Mission 3: Canvas Persistence And AI Integration

North star objective: mobile and web canvases become real product workflows.

Scope:

- Persist canvas projects/screens/pages.
- Wire canvas generation and refinement to backend orchestration.
- Add dedicated mobile and website composers.
- Add save/reload/publish tests.

### Mission 4: Export Truth And Handoff Contracts

North star objective: every visible export either works or is hidden.

Scope:

- Launch-mode filter for implemented formats.
- Fix export failure analytics.
- Implement the highest-value exports selected for launch.
- Add export validators and worker tests.

### Mission 5: Multimodal And Clarification Completion

North star objective: uploads and clarify chips materially improve AI output.

Scope:

- Replace vision stubs with real extraction jobs.
- Implement `/studio/generate/continue`.
- Add scope/breakpoint/reference clarification support.
- Add multimodal eval fixtures.

### Mission 6: Half-Wired Surface Sweep

North star objective: no paid-user route contains a dead button, 501, or vague roadmap promise.

Scope:

- Sweep stubs, coming-soon cards, roadmap exports, disabled buttons, and placeholder worker jobs.
- Feature-flag, finish, or remove each item.
- Add CI checks for new stubs in product paths.

### Mission 7: Launch Operations And Observability

North star objective: production can be monitored, debugged, rolled back, and restored.

Scope:

- Complete `docs/LAUNCH_CHECKLIST.md`.
- Add deep health checks.
- Enforce production env validation.
- Verify Sentry, metrics auth, backups, Redis/worker, Stripe webhooks, Resend, OAuth, DNS, and TLS.
- Run production-like smoke tests.

### Mission 8: UI/UX Polish And Accessibility Proof

North star objective: Forge feels calm, clear, professional, and obvious across every route.

Scope:

- Route-by-route visual audit.
- Empty/loading/error state audit.
- Authenticated axe sweep.
- Lighthouse budgets.
- Public-page polish and Made with Forge badge QA.
- Shortcut and undo/redo completion.

## Launch Readiness Summary

Do not launch self-serve paid users until the P0 items are complete:

- Public page API URL bug fixed and tested.
- Billing plan changes, extra usage, and concurrency caps completed.
- Canvas promises either completed or scoped out of launch copy.
- Export promises reduced to working formats or implemented.
- Launch checklist signed off with production env, webhooks, backups, Sentry, DNS, TLS, support, and on-call.

Forge can be positioned for a controlled pilot sooner if the pilot scope is explicitly limited to working flows: authenticated Studio generation for supported page-backed workflows, publish/public pages after the URL fix, submissions, analytics basics, and a reduced export set.
