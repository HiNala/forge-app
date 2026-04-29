# Refund playbook (BP-04)

This is a concise operator guide for handling **refund requests** once the `refund_requests` table and admin UI exist.

## Principles

1. **Stripe is source of truth** for card charges — always issue Stripe refunds instead of manipulating usage rows directly unless engineering signs off.
2. **Audit everything** — every approval/denial should write an `audit_log` row with rationale.
3. **Auto-approve** onlywhen policy is unambiguous (e.g. dup charge, churn within SLA with \<5% credit use). Anything fuzzy goes to manual review within 24h.

## Stub

Forge will track: duplicate charges, cancellations within SLA, downgrade timing disputes, goodwill credits. Wiring is pending — see `docs/missions/MISSION-BP-04-REPORT.md`.
