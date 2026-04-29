# Stripe chargebacks & disputes

**Last verified:** 2026-04-28  

## Symptom

Stripe webhook `charge.dispute.created` / dashboard shows open dispute.

## Likely causes

- Customer confusion on billing descriptor.
- Family card / fraud.

## Diagnostics

1. Stripe Dashboard → Dispute → timeline + evidence deadlines.
2. Internal: account age, invoices, Forge audit log for cancellations.

## Resolution playbook

1. Gather receipts, ToS acceptance timestamp, usage metrics (exported from billing tables).
2. Submit Stripe evidence **before deadline**.
3. If lost, annotate account; consider plan restrictions per policy.

## Escalation

Finance owner + Stripe admin.
