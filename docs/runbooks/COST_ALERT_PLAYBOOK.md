# LLM cost spike — playbook

**Last verified:** 2026-04-28  

## Symptom

Sudden spike in LLM bills, anomaly alerts, or Forge admin “cost” dashboards diverging.

## Likely causes

- Abuse / traffic surge on public endpoints.
- New bug causing retry storms or duplicated jobs.
- Model routing change routing everything to flagship models.

## Diagnostics

See `docs/runbooks/COST_MODEL.md` + `docs/runbooks/LLM_DEBUGGING.md`:
- Correlate spikes with **`request_id`** in API logs / Sentry.
- Check **`arq` worker depth** (`docs/runbooks/WORKER.md`).
- Review rate limits and org quotas in billing surfaces.

## Resolution

1. Throttle offending org/route if abusive (coordinate with Billing / Support playbook).
2. Roll back offending deploy if regression.
3. Open incident if customer-visible generation degradation.

## Escalation

On-call engineer → product for customer comms → finance approval for Stripe credits/refunds policy.
