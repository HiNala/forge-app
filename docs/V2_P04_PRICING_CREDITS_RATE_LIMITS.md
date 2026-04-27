# V2 MISSION P-04 — Pricing Tiers, Credit Tracking & Rate-Limit UX

**Goal:** Replace the current Starter/Pro/Enterprise pricing scheme with a Free/Pro/Max structure modeled on Anthropic's Claude pricing — three tiers, predictable monthly fees, **session-based usage** with weekly caps, and an honest percentage-bar visualization that tells the user exactly how much capacity remains. Build the credit-and-token accounting backbone behind it: every LLM call, every page generation, every region edit deducts from a session budget; sessions reset on a rolling window; weekly caps prevent edge-case abuse; admin can toggle providers (OpenAI / Gemini / future Anthropic) without users seeing the change. After this mission, Forge's pricing is on every marketing surface, Brian's unit economics are predictable, and a user looking at their usage settings sees the same Claude-like progress bars Brian wants — clean, honest, and a constant-but-not-annoying reminder of where they stand.

**Branch:** `mission-v2-p04-pricing-credits-rate-limits`
**Prerequisites:** BI-04 (settings/billing infrastructure) and GL-01 (analytics) complete. The `usage_counters` table exists. The orchestration layer's per-call cost tracking is in place. Stripe integration is wired.
**Estimated scope:** Large. The pricing model migration alone is significant (existing Starter/Pro orgs grandfathered correctly), and the rate-limit UX has to be implemented across every surface (Studio, Dashboard, Settings, marketing).

---

## Experts Consulted On This Mission

- **Anthropic Claude Pricing (April 2026)** — *Three tiers, session + weekly caps, transparent percentage bars, "Adjust limit" + extra-usage controls.*
- **Tony Fadell** — *Rate limits should never surprise. Show the user where they stand before they hit the wall.*
- **Don Norman** — *Pricing is a contract. Both sides should clearly understand what's exchanged.*
- **April Dunford** — *Pricing communicates positioning. "Pro" carries a different message than "Builder" or "Premium."*
- **Patrick McKenzie / Stripe SaaS Playbook** — *Predictable subscriptions over usage-based for prosumer tools. Cost overruns are how SaaS gets canceled.*

---

## How To Run This Mission

The pricing model is the strategic core of the V2 platform reframe. Get it wrong and unit economics break or users churn. Get it right and Forge funds itself.

The model, in plain language:

- **Free** — for trying Forge. Generous-but-bounded. No credit card required.
- **Pro** — for most makers. The price most users will pay. Comfortable for daily use.
- **Max** — for power users who hit Pro limits frequently or need higher concurrency. Two sub-tiers: Max 5x and Max 20x, mirroring Claude's pattern.

Within each tier, usage is governed by:
1. A **session budget** — a rolling 5-hour window that resets when it expires. Replenishes the included capacity.
2. A **weekly cap** — across all sessions in a 7-day window, total usage can't exceed a ceiling. Prevents one user from running all sessions back-to-back at full throttle.

Every generation, every region edit, every refine consumes from the session budget. Costs differ by complexity (a single contact form is cheap, a 10-page website is expensive). Costs are denominated in **Forge Credits** — an internal abstraction that hides the underlying token math from the user. One credit ≈ one mental "small action."

Admin toggles (OpenAI vs Gemini vs Anthropic) happen at the platform/org level, not per user. The user always sees a unified "Forge built it" experience and a unified credit cost.

The percentage-bar UX is the centerpiece — borrowed in spirit from Claude's settings/usage screen but tuned to Forge's brand. Users see live progress against both the session budget and the weekly cap on every relevant surface.

Commit on milestones: pricing model documented, plan migration script, credit-cost calculator, session-window engine, percentage-bar component, marketing pricing page, in-app usage surface, extra-usage flow, admin provider toggle, tests green.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Pricing Model Specification

1. Write `docs/billing/PRICING_MODEL.md` — the canonical reference for every dimension of the pricing scheme. Structure:
    - **Tier names**: Free, Pro, Max 5x, Max 20x. Use these exact names everywhere.
    - **Pricing** (initial values, revisable):
        - Free — $0/mo
        - Pro — $20/mo (annual: $200/yr, ~$17/mo equivalent)
        - Max 5x — $100/mo (annual: $1000/yr)
        - Max 20x — $200/mo (annual: $2000/yr)
    - **Session-budget allocations** (in Forge Credits):
        - Free — 50 credits per 5-hour session, 200 credits weekly cap
        - Pro — 500 credits per 5-hour session, 5000 weekly cap
        - Max 5x — 2500 credits per 5-hour session, 25000 weekly cap
        - Max 20x — 10000 credits per 5-hour session, 100000 weekly cap
    - **Credit costs by action** (the Forge Credit Conversion Table):
        - Single-page generation (form / landing / proposal cover) — 5 credits
        - Multi-section refinement — 3 credits
        - Region-scoped edit (the marquee tool from V2-02/03) — 1 credit
        - Section-click edit — 2 credits
        - Pitch deck (10 slides) — 25 credits (slides parallelize but cost stacks)
        - Multi-page website (5 pages) — 30 credits
        - Multi-screen mobile flow (5 screens) — 25 credits
        - Image generation (per image) — 2 credits
        - Whole-deck export to PPTX — free (no LLM cost)
        - Brand-extract from URL — 1 credit (one-time per domain per 24 hours; cached after)
    - **What's included beyond credits** (per tier):
        - Free: 1 published mini-app, 50 submissions/month, basic analytics, "Made with Forge" badge.
        - Pro: 25 published mini-apps, 5,000 submissions/mo, full analytics, custom domain (1), 3 team seats, badge removed.
        - Max 5x: 100 published, 50,000 submissions, 10 custom domains, 10 seats, priority generation, advanced exports.
        - Max 20x: 500 published, 250,000 submissions, unlimited domains, 25 seats, priority generation + concurrency, all exports.
    - **Extra usage** (Anthropic-style overflow):
        - All paid plans can opt into "Extra usage" — when session/weekly is exhausted, additional generations bill at standard credit-overage rates ($0.10/credit on Pro, $0.08/credit on Max 5x, $0.05/credit on Max 20x).
        - Off by default. User explicitly enables in Settings → Billing. Has a configurable monthly spend cap.
    - **Concurrency caps** (per tier):
        - Free — 1 simultaneous generation
        - Pro — 2 simultaneous
        - Max 5x — 5 simultaneous
        - Max 20x — 15 simultaneous
        Hitting concurrency cap queues additional generations briefly with a "Hold on, finishing the previous build" message.
    - **Migration path** for existing Starter/Pro/Enterprise customers (Phase 8).
2. Get this document reviewed by Brian. The numbers will move; the structure shouldn't.

### Phase 2 — Forge Credits As An Abstraction

3. Add the `forge_credits` concept to the data model (migration):
    ```sql
    ALTER TABLE usage_counters
      ADD COLUMN credits_consumed_session BIGINT NOT NULL DEFAULT 0,
      ADD COLUMN credits_consumed_week BIGINT NOT NULL DEFAULT 0,
      ADD COLUMN session_window_start TIMESTAMPTZ,
      ADD COLUMN week_window_start TIMESTAMPTZ;

    CREATE TABLE credit_ledger (
      id BIGSERIAL PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id),
      page_id UUID REFERENCES pages(id),
      orchestration_run_id UUID REFERENCES orchestration_runs(id),
      action TEXT NOT NULL,           -- 'page_generate' | 'section_edit' | 'region_edit' | etc
      credits_charged INT NOT NULL,
      tokens_input INT,
      tokens_output INT,
      provider TEXT,                  -- the underlying provider used
      model TEXT,                     -- the underlying model
      cost_cents_actual INT,          -- our actual cost from the provider
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_credit_ledger_org_created ON credit_ledger(organization_id, created_at DESC);
    ```
    RLS enabled on `credit_ledger`.
4. The credit ledger is **append-only** — no UPDATEs or DELETEs. Every charge persists for audit. The `credits_consumed_*` columns on `usage_counters` are denormalized rollups for fast queries; recomputable from the ledger if ever lost.
5. Build `app/services/billing/credits.py`:
    - `compute_charge(action, context) → int` — looks up the action's credit cost from the conversion table, multiplies by any context factors (e.g., a 10-page website charges 10× the per-page rate, an image gen charges per image).
    - `check_balance(org_id, charge_amount) → BalanceCheck` — returns `{can_proceed, session_remaining, week_remaining, would_use_extra_usage, projected_overage_cents}`.
    - `apply_charge(org_id, run_id, action, charge, ledger_metadata)` — writes to ledger + updates rollups. Atomic via SERIALIZABLE transaction.
6. Every orchestration graph (from O-02) calls `check_balance` BEFORE starting the LLM work and `apply_charge` AFTER it completes. This way:
    - Users with insufficient balance are stopped with a friendly upgrade prompt before the model spins up (zero wasted spend on our end).
    - Charges only happen for actually-completed work. Failed generations don't consume credits.
    - If a generation degrades to a partial result (cost-budget exceeded mid-run), we charge the prorated portion based on token usage actually incurred.

### Phase 3 — Session & Weekly Window Engine

7. The session window mimics Claude's: rolling 5-hour starting from the user's first action in a session. Implement in `app/services/billing/sessions.py`:
    ```python
    async def get_active_window(org_id) → SessionWindow:
        """
        Returns the current session and weekly window, opening fresh ones if the previous expired.
        """
        # Session: 5-hour rolling. If `session_window_start` is None or > 5h ago, open fresh.
        # Week: 7-day rolling. Same rule, 7-day basis.
        # Reset both `credits_consumed_session` and `credits_consumed_week` on rollover.
    ```
8. The session is **per-org**, not per-user. A team-of-five org shares one session budget. Team plans (Phase 7) get scaled budgets to compensate.
9. Edge cases:
    - A user's session never completes (all their work fits inside one window). They get a fresh budget on the 5-hour mark.
    - A user blasts through their session in 30 minutes. They're rate-limited until 5 hours elapse from the WINDOW START (not from when they hit the limit — important to be transparent).
    - The weekly cap hit independently of the session — even with a fresh session window, no further charges until the weekly resets.
10. Display logic — what time the user sees:
    - Session reset time: "Resets in 2 hr 17 min".
    - Weekly reset time: "Resets Thursday 4:59 AM" (matching the user's timezone, exact reset moment).
    - These calculations happen server-side and are returned in every API response that touches usage so the frontend's percentage bars stay accurate to the second.

### Phase 4 — Percentage Bar Component (The UX Centerpiece)

11. Build `apps/web/src/components/usage/UsageBar.tsx` — the headline UI primitive. Inspired by Claude's settings/usage screen:
    - A horizontal bar at full container width.
    - Background: muted neutral track (`bg-neutral-200` light / `bg-neutral-800` dark).
    - Fill: brand teal at the percentage of consumption. Animated transitions on changes.
    - Right-aligned label: "{percent}% used".
    - Below the bar: "Resets {time_phrase}".
    - Above the bar (optional): label like "Current session" or "Weekly limit — All models".
    - Hover/focus reveals tooltip with exact numbers ("147 / 500 credits used").
12. The bar has **states** for visual emphasis:
    - 0–69%: brand teal, calm.
    - 70–89%: warm amber-teal blend, slight emphasis.
    - 90–99%: warm orange, brighter.
    - 100%: muted red. Bar reads "Limit reached" instead of percentage.
13. Reduced motion: instant changes, no animated fills.
14. Accessibility: `role="progressbar"`, `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100`. Tooltip text reachable via keyboard focus.
15. Tests verify the four state transitions render correctly and animations respect reduced-motion.

### Phase 5 — In-App Surfaces Showing Usage

16. **Settings → Usage page** (the canonical destination, mirroring Claude's `/settings/usage`):
    - Top: tier badge ("Pro") and "Adjust limit" button if extra usage is enabled.
    - Plan usage section:
        - "Current session" bar (session budget).
        - Below if applicable: workflow-specific bars (e.g., "Mobile App Design — 60% used"). These give visibility into where the credits went without forcing the user to read the ledger.
    - Weekly limits section:
        - "All workflows" bar (weekly cap).
        - "Last updated" timestamp with a manual refresh button.
    - Additional features section:
        - Other bounded resources (e.g., "Custom domains: 1/1 used", "Team seats: 3/3", "Published mini-apps: 7/25"). These don't reset; they're current totals against tier max.
    - Extra usage section:
        - Toggle to enable.
        - "Spent this period" bar (against the user's set monthly cap).
        - "Adjust limit" button to change the cap.
        - "Buy extra usage" button for one-time top-ups (with "Up to 30% off" promo on bulk).
        - Auto-reload toggle.
17. **Studio chat panel** — small bar at the very bottom of the chat panel showing session usage. Always visible while the user is generating.
18. **Top bar** — a compact battery-style indicator next to the user's avatar. Hovering reveals a quick-look popover with the same numbers as Settings → Usage. Click routes to the full settings page.
19. **Pre-action warnings**:
    - When the user is about to issue a prompt and would consume > 50% of remaining session budget, show a small banner: "This will use about 30% of your remaining session credits."
    - When session is fully exhausted: instead of issuing the prompt, show an inline upgrade card with the percentage bar at 100%, the reset time, and "Upgrade to Pro/Max" + "Enable extra usage" buttons.
    - These pre-warnings turn rate limits from a surprise into a predictable choice — the Tony Fadell discipline.
20. **Generation completion toast** — after every generation, a small toast at the bottom: "Generated home page · 5 credits used · 73% session remaining." Adds transparency without being annoying. Auto-dismisses in 3 seconds; opt-out toggle in user preferences.

### Phase 6 — Marketing Pricing Page

21. Build out the pricing page (the structure was roughed in V2-01; finalized here with real numbers):
    - **Three columns** for Free / Pro / Max. Max 5x and Max 20x are sub-options under the Max column with a small toggle ("5x" / "20x") that swaps the price and capacity numbers.
    - Each card shows:
        - Plan name
        - Price/month (with annual-discount toggle at the top of the section)
        - One-line positioning ("For trying Forge", "For most makers", "For power users")
        - Big checkmark list of what's included
        - "Get started" CTA — Free routes to signup, Pro/Max route to checkout
    - Below the columns: a **session-and-weekly-limit explainer** with a live-looking percentage bar visualization showing how Pro vs Max compare ("On Pro, you get 500 credits per session. That's about 100 contact form refines. On Max 5x, that's 2500 — daily heavy use."). The bar is illustrative, not interactive.
    - **Comparison table** under a disclosure ("See full comparison →") with every dimension: page count, submissions, custom domains, seats, AI provider control, exports, support level, etc.
    - **FAQ** at the bottom with the eight or so questions every visitor asks.
22. The pricing page also has a small "Calculator" widget (deferred, optional in this mission): user picks how many forms / proposals / decks they expect to build per month, calculator recommends a tier. Nice-to-have for the conversion bump but not blocking.

### Phase 7 — Team / Workspace Pricing

23. Pro and Max include team seats (3 and 10 respectively). Additional seats:
    - Pro additional seat: $10/seat/month
    - Max 5x additional seat: $25/seat/month
    - Max 20x additional seat: $50/seat/month
24. Team seats DO NOT increase the session/weekly budget — they share. This matters for unit economics. If a team needs more capacity, they upgrade tiers, not add seats.
25. Future "Team plan" with separate billing for organizations of 10+ developers is out of scope for this mission; documented as a future product.

### Phase 8 — Migrating Existing Customers

26. Before this mission ships, the database has Starter / Pro / Enterprise plan slugs in `organizations.plan`. The migration:
    - Existing **Starter** orgs → migrate to **Free** (preserves spirit; capacity may slightly shift but is communicated).
    - Existing **Pro** orgs → stay on **Pro** with the new credit-budget allocation; price stays $20.
    - Existing **Enterprise** orgs → migrate to **Max 20x** by default unless their custom contract specified otherwise. Brian reviews each and confirms.
    - Anyone who would lose meaningful capacity in the migration gets a "grandfathered" override stored in `org_feature_flags`: their old capacity stays as a floor for 6 months, then they migrate fully.
27. Communicate the change in advance: in-app banner 7 days before the cutover, email 7 days and 1 day before, blog post explaining the new model and why. Honesty + transparency over surprise.
28. Stripe price IDs change. New prices created in Stripe; old prices archived (not deleted). Subscriptions migrate via Stripe's `subscriptionSchedule` to the new prices on the next billing cycle.
29. The migration script is dry-runnable (`--dry-run` flag) and prints the affected orgs + before/after capacity. Brian reviews before running for real.

### Phase 9 — Extra Usage (Anthropic-Style Overflow)

30. The extra-usage feature is a small but critical addition. When enabled:
    - The session/weekly limits are no longer hard. Once exhausted, additional generations charge at the per-credit overage rate listed in Phase 1.
    - Charges accumulate in a separate `extra_usage_charges` ledger and bill via Stripe's metered usage API at the end of each billing period.
    - User sets a monthly cap. Hitting the cap stops further charges (and reverts to a hard rate limit until the cap or period resets).
    - "Buy extra usage" one-time top-ups are also supported via Stripe Checkout — adds prepaid credits that drain before metered usage starts.
31. Implementation:
    - Add `extra_usage_enabled BOOLEAN`, `extra_usage_monthly_cap_cents INT`, `extra_usage_balance_cents INT` columns to `organizations`.
    - On rate-limit hit: if `extra_usage_enabled`, charge against monthly cap. Else, return a 402 with the standard "upgrade or wait" UX.
    - Stripe metered billing item ID stored on org. End-of-period worker submits the accumulated overage as a usage record.
32. Pre-action warning: when extra usage is enabled and the user is about to incur charges (session exhausted), show "This generation will use ~$0.50 of extra usage. Continue?" — explicit consent every time.

### Phase 10 — Admin Provider Toggle

33. The user requirement: admin can choose OpenAI vs Gemini vs Anthropic for the platform. Users see a uniform "Forge" experience regardless.
34. Build `(admin)/system/llm-routing/page.tsx`:
    - Per-role provider selection (intent_parser, composer, section_editor, reviewer, voice_inferrer, refiner, mobile_composer, web_composer).
    - For each role: pick primary provider + model from a dropdown. Pick the fallback chain order.
    - Save changes propagate immediately (Redis-cached config invalidates on save).
    - "Test" button issues a synthetic call against the selected provider/model, verifies a valid response.
35. The user-facing UI never mentions providers. The only place a user can see anything is in the admin's `orchestration_runs` view (already restricted by RBAC).
36. Per-org override capability: a Max 20x customer who specifically wants only Anthropic models for compliance reasons can have an org-level override stored in `org_feature_flags`. Admin can grant.
37. Cost-routing intelligence: in production, route based on cost-per-quality-score over the trailing 7 days. If GPT-4o produces equivalent quality to Claude Opus on a role at 60% the cost, default to GPT-4o. Maintain this ranking in a `model_quality_metrics` table updated by a scheduled job.

### Phase 11 — Testing The Pricing Path

38. Test: a Free-tier org generates pages until session is exhausted; further generation returns 402 with the exact friendly message.
39. Test: extra-usage flow on Pro — exhaust session, verify next generation incurs metered usage, verify Stripe usage record is submitted at period end (mock Stripe).
40. Test: weekly cap independent from session — rapidly generate to hit the weekly cap on Free; even after a session window expires, no further generations.
41. Test: rollover edge case — at the exact 5-hour mark, the next request opens a fresh session and clears `credits_consumed_session`.
42. Test: concurrency cap — issue 3 simultaneous generations on Free (cap 1), verify two queue and process sequentially.
43. Test: pricing page render with each plan toggled, all FAQs accessible, "compare plans" disclosure expands.
44. Test: in-app percentage bars update in real-time as generations consume credits (within 1 second of the credit charge).
45. Test: migration script dry-run on a snapshot of production data, verify expected before/after states.
46. Test: admin provider toggle changes the underlying provider for the next call (verified via the orchestration_run trace showing the new provider).
47. Test: the credit_ledger is append-only at the DB level (no UPDATE or DELETE permission for `forge_app` role).

### Phase 12 — Documentation & Runbooks

48. `docs/billing/PRICING_MODEL.md` (Phase 1) is the user-facing definition.
49. `docs/architecture/CREDIT_SYSTEM.md` covers the engineering implementation: credit ledger, session windows, weekly windows, charge atomicity, provider pricing.
50. `docs/runbooks/PRICING_INCIDENTS.md` — playbooks for: "user reports incorrect credit charge" (how to inspect ledger), "session not resetting" (how to manually clear), "Stripe metered usage not billed" (how to retry submission).
51. `docs/runbooks/PRICING_CHANGES.md` — when and how to change credit costs or tier prices without breaking existing customers (always grandfather; communicate 30+ days in advance).
52. Update the README's pricing summary section.
53. Mission report — see [`docs/missions/V2_P04_MISSION_REPORT.md`](./missions/V2_P04_MISSION_REPORT.md) (updated as work lands; P-04 is **not** closed until every acceptance criterion below is true in prod).

---

## Acceptance Criteria

- `PRICING_MODEL.md` is canonical and reviewed.
- Three-tier (Free / Pro / Max with 5x and 20x) pricing is in production with correct credit budgets per tier.
- Forge Credits abstract LLM token cost into mental "small action" units.
- Session budgets reset on rolling 5-hour windows; weekly caps prevent overuse.
- The percentage-bar component matches the Claude-inspired aesthetic with the four state colors and accessible labels.
- In-app surfaces (Settings → Usage, Studio chat panel, top-bar indicator) show live usage.
- Marketing pricing page presents Free / Pro / Max clearly with the session-limit explainer and comparison table.
- Existing Starter / Pro / Enterprise orgs migrated correctly; grandfathered overrides applied where needed.
- Extra-usage opt-in with monthly caps works via Stripe metered billing.
- Concurrency caps queue overflow generations gracefully.
- Admin provider toggle changes routing without user-visible impact.
- All tests pass; ledger integrity verified.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
