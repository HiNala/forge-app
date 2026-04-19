# On-call (Forge)

## Scope

Alerts from Sentry, Railway, Stripe webhooks, and (optional) BetterStack/Instatus for `status.*`.

## Routing

- **Primary:** Slack/Discord channel `#forge-ops` (example).
- **Escalation:** page only for SEV1/SEV2 or repeated failures.
- **Email:** on-call rotation list (configure in PagerDuty/Opsgenie or manual calendar).

## Response times (suggested)

| Severity | Ack | Mitigation start |
|----------|-----|------------------|
| SEV1 | 15 min | 30 min |
| SEV2 | 1 h | 4 h |
| SEV3 | next business day | best effort |

## Handoff

Each shift: confirm Railway dashboards green, `/health/deep` OK, no open Sentry criticals.

See [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) for communication templates.
