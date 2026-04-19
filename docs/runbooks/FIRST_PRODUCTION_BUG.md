# First production bug — triage template

1. **Severity** — SEV1 (outage) / SEV2 (major feature broken) / SEV3 (workaround exists) / SEV4 (cosmetic).
2. **Customer impact** — who is blocked, since when.
3. **Reproduction** — minimal steps; include org id / page id if safe.
4. **Evidence** — Sentry link, request id, logs (Railway), Stripe webhook id if billing-related.
5. **Mitigation** — rollback? hotfix? feature flag?
6. **Root cause** — after fix: 5 whys, what test was missing.
7. **Follow-up** — ticket for test, docs, alert threshold.

Store post-mortems in the team wiki or private repo; link from the incident ticket.
