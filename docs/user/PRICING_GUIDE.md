# Pricing guide (Forge)

Forge bills through **Stripe**. Workspace owners manage payment methods and invoices in Stripe’s billing portal (`Settings → Billing`).

## Forge Credits

- **Session credits** reset on a rolling 5-hour window tied to Studio usage sessions.
- **Weekly credits** cap longer bursts of generation.
- **Extra usage**: paid tiers may enable metered Forge Credit overages up to an org-defined **month cap** (`Settings → Usage`).

## Estimates vs actuals

The Studio estimates a run before you send it (`POST /studio/estimate`). Charges post when the orchestration completes; streamed “provisional” counters help you visualize progress but the **invoiceable amount** aligns with ledger entries at completion.
