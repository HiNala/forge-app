# Forge pricing model (V2 — canonical)

**Status:** Source of truth for V2 reframe. Revenue numbers and credit caps are tunable; **structure** (Free / Pro / Max 5x / Max 20x, session + weekly caps, Forge Credits) should not change without product + finance review.

## Tier names (use everywhere in UI, API, and Stripe)

| Tier | |
| --- | --- |
| **Free** | |
| **Pro** | |
| **Max 5x** | |
| **Max 20x** | |

`plan` slugs: `free`, `pro`, `max_5x`, `max_20x` (plus legacy: `starter`, `enterprise`, `trial` — see migration path).

## Monthly pricing (revisable)

| Tier | Monthly | Annual (note) |
| --- | --- | --- |
| Free | $0 | — |
| Pro | $20 | $200/yr (~$17/mo) |
| Max 5x | $100 | $1,000/yr |
| Max 20x | $200 | $2,000/yr |

## Session and weekly limits (Forge Credits)

Rolling **5-hour session** and **7-day week** (from window start) — see `docs/architecture/CREDIT_SYSTEM.md` for the engine.

| Tier | Session budget (5 h) | Weekly cap (7 d) |
| --- | ---: | ---: |
| Free | 50 | 200 |
| Pro | 500 | 5,000 |
| Max 5x | 2,500 | 25,000 |
| Max 20x | 10,000 | 100,000 |

**One Forge Credit** ≈ one “small” user-visible action. Under the hood, costs map to LLM token usage; users never see raw tokens in product UI.

## Forge Credit conversion table (action → credits)

| Action | Credits |
| --- | ---: |
| Single-page generation (form / landing / proposal cover) | 5 |
| Multi-section refinement | 3 |
| Region-scoped edit (marquee) | 1 |
| Section-click edit | 2 |
| Pitch deck (10 slides) | 25 |
| Multi-page website (5 pages) | 30 |
| Multi-screen mobile flow (5 screens) | 25 |
| Image generation (per image) | 2 |
| Whole-deck export to PPTX | 0 (no LLM) |
| Brand-extract from URL | 1 (once per domain / 24 h; then cached) |

**Dynamic scaling:** e.g. N-page site charges `N ×` per-page unit where we define a per-page credit rate (or use table default × page count) — `compute_charge` in the API encodes the rules.

## What else is included (non-credit)

| | Free | Pro | Max 5x | Max 20x |
| --- | ---: | ---: | ---: | ---: |
| Published mini-apps | 1 | 25 | 100 | 500 |
| Submissions / month | 50 | 5,000 | 50,000 | 250,000 |
| Analytics | basic | full | full | full |
| Custom domains | 0 | 1 | 10 | “unlimited”* |
| Team seats (included) | 1 | 3 | 10 | 25 |
| Badge | “Made with Forge” on | off | off | off |

*Practical high limit in enforcement; no hard “infinity” in DB.

## Extra usage (over-cap)

- Paid plans may opt in to **Extra usage**: after session/weekly credits are exhausted, use continues and bills at **overage rate per credit** (Stripe metered or prepaid balance).
- **Off by default.** User enables under Settings → Billing.
- **Overage rates (initial):** Pro $0.10/credit, Max 5x $0.08/credit, Max 20x $0.05/credit.
- User sets a **monthly spend cap**; at cap, hard block until next period or cap change.

## Concurrency (simultaneous generations)

| Tier | Max concurrent |
| --- | ---: |
| Free | 1 |
| Pro | 2 |
| Max 5x | 5 |
| Max 20x | 15 |

Additional requests queue with a “finishing the previous build” style message (implementation: Phase 2 of rate-limit UX).

## Team / extra seats (do not add credits)

- Pro additional seat: $10/mo  
- Max 5x additional: $25/mo  
- Max 20x additional: $50/mo  

Seats **share** the org’s session/weekly pools — they do not multiply them. More capacity = higher tier.

## Extra usage — Stripe (implementation)

- `extra_usage_enabled`, `extra_usage_monthly_cap_cents` on the organization.  
- Overage accrues to `extra_usage_spent_period_cents` (or separate ledger) and is invoiced with Stripe’s metered price at period end, plus optional **one-time** prepaid top-ups.

## Migration from Starter / Pro / Enterprise

- **starter** → **free** (new slug `free` or cap-equivalent)  
- **pro** → **pro** (same $20, new credit tables)  
- **enterprise** → **max_20x** by default, unless contract says otherwise.  
- Grandfathering: `org_feature_flags` may pin old numeric floors for 6 months.

Communicate: in-app + email 7 days before, blog post, no silent downgrades for paying customers.

## Review

Product owner: **Brian** — numbers and rates can move; this file must list every dimension so pricing stays honest (Don Norman / April Dunford).
