# Forge Pre-Launch Todo List

Date: 2026-04-28

This list converts the pre-launch audit into a concrete launch track. Items marked "external" require live service access, production secrets, DNS, Stripe Dashboard, Railway, or business sign-off and cannot be truthfully completed from the local workspace alone.

## P0: Local Launch Blockers

1. [x] Fix published public page API URL construction so `NEXT_PUBLIC_API_URL` works both with and without `/api/v1`.
2. [x] Add regression coverage for public page URL construction using host-only and `/api/v1` env values.
3. [x] Harden public `srcDoc` iframe sandbox by removing `allow-same-origin` from live public pages unless a specific reviewed runtime requires it.
4. [x] Add a CSP meta tag to public `srcDoc` HTML so generated content has an explicit script, style, image, form, object, and base-uri policy.
5. [x] Keep Studio draft/preview iframes separate from public runtime because Studio needs same-origin bridge behavior for direct manipulation.
6. [x] Hide unimplemented export formats from the launch API response unless an internal/admin flag explicitly asks for planned formats.
7. [x] Fix deck PDF/PPTX export queue handling so queue failures emit `export_failed` and return an error instead of false success.
8. [x] Add tests proving launch-mode export listings only contain implemented formats.
9. [x] Remove disabled "Coming soon" integrations from paid settings surfaces or move them to roadmap-only marketing/docs.
10. [x] Replace user-reachable billing plan-change `501` endpoints with a working Stripe Checkout or Customer Portal redirect.
11. [x] Update backend OpenAPI/product description from "AI page builder" to "mini-app platform."
12. [x] Add production config gates for weak secrets, wildcard trusted hosts, missing metrics token, missing Sentry DSN, missing Clerk config, and incomplete Stripe webhook config.
13. [x] Add tests for production config validation so insecure production defaults cannot regress.

## P0: External Launch Gates

14. [ ] External: Configure Stripe live products and Prices for the launch plan set, with stable price IDs.
15. [ ] External: Configure Stripe Customer Portal product catalog for subscription update, cancellation, invoice history, and payment method update.
16. [ ] External: Register Stripe live webhook endpoint, set `STRIPE_WEBHOOK_SECRET`, and replay delayed, duplicate, and out-of-order events.
17. [ ] External: Configure usage-based/metered billing for extra Forge Credit usage or hide extra usage until the meter is live.
18. [ ] External: Verify Resend sending domain, webhook secret, SPF/DKIM/DMARC, and a real transactional email.
19. [ ] External: Verify Clerk production issuer, JWKS URL, audience, webhook secret, redirect URLs, and callback URLs.
20. [ ] External: Verify Google OAuth production redirect URIs for calendar features or hide Google Calendar from launch scope.
21. [ ] External: Set Sentry DSNs for API, web, and worker, then confirm release/environment tagging.
22. [ ] External: Configure metrics scraping with bearer auth and confirm `/metrics` is not publicly readable.
23. [ ] External: Confirm Railway production deploy requires manual approval and has all required variables.
24. [ ] External: Confirm Postgres backups, restore drill, Redis persistence/eviction policy, and worker restart behavior.
25. [ ] External: Verify DNS, TLS, wildcard domain behavior, Caddy on-demand `ask`, and custom domain rollback.

## P1: Billing, Credits, And Limits

26. [ ] Normalize plan names and UI copy to the chosen launch plan set: Free, Pro, Max 5x, Max 20x, or explicitly defer Max.
27. [ ] Implement per-tier generation concurrency caps before model execution.
28. [ ] Ensure 402 responses distinguish monthly quota, session credits, weekly credits, and extra-usage cap.
29. [ ] Show pre-action Forge Credit estimates before generate, refine, and region edit actions.
30. [ ] Ensure `credit.charged` updates Studio, Usage, and Billing usage bars without a manual refresh.
31. [ ] Add Stripe checkout, portal, webhook idempotency, upgrade, downgrade, cancel, failed-payment, and invoice tests with mocked Stripe responses.

## P1: Canvas And AI Mission Scope

32. [ ] Persist web and mobile canvas projects/screens/pages beyond client memory.
33. [ ] Add dedicated mobile and website composer roles/prompts instead of routing both through generic composition.
34. [ ] Wire mobile/web canvas generate, save, reload, refine, publish, and export flows end to end.
35. [ ] Implement `/studio/generate/continue` so clarify chips can re-enter orchestration state.
36. [ ] Replace multimodal extraction stubs with async OCR/color/layout/reference extraction jobs.
37. [ ] Replace heuristic region drift checks with structured DOM/component-tree diff validation where possible.
38. [ ] Add Playwright coverage for canvas generate, marquee select, region refine, save, reload, publish, and export.

## P2: Launch Polish And Proof

39. [ ] Run route-by-route visual, keyboard, dark-mode, loading, empty, and error-state QA for marketing, app, public pages, settings, analytics, and Studio.
40. [ ] Run authenticated axe and Lighthouse sweeps, record results in docs, and fix launch-blocking accessibility/performance issues.
