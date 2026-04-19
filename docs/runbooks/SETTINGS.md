# Settings backend map (BI-04)

## User

| Area | Endpoint | Who |
|------|----------|-----|
| Profile | `PATCH /api/v1/auth/me` | Self |
| Preferences (merged JSON + defaults) | `GET/PATCH /api/v1/auth/me/preferences` | Self; PATCH needs active org for audit |
| Legacy alias | `POST /api/v1/auth/preferences` | Same as PATCH |
| Account delete | `DELETE /api/v1/auth/me` | Self |

## Organization

| Area | Endpoint | Who |
|------|----------|-----|
| Core org + brand | `/api/v1/org` (existing) | Owner/editor per route |
| Typed org settings JSON | `GET/PATCH /api/v1/org/settings` | Read: owner/editor/viewer; write: owner |
| Custom domains | `GET/POST/DELETE /api/v1/org/custom-domains`, `POST .../verify` | Pro+ plan for create; read wider |
| API tokens | `GET/POST/DELETE /api/v1/org/api-tokens` | Owner |
| Outbound webhooks | `GET/POST /api/v1/org/webhooks/outbound` | Owner (write) |
| Email template overrides | `GET/PUT /api/v1/org/email-templates` | Owner/editor read; owner write |
| Audit log | `GET /api/v1/org/audit` | Owner |

## Notifications (in-app)

- `GET/POST/DELETE /api/v1/notifications` — recipient only (RLS).

## Billing (stubs)

- `POST /api/v1/billing/plan/upgrade`, `/plan/downgrade`, `/plan/downgrade/cancel` — return 501 until Stripe schedule wiring.

## API tokens

- Header: `Authorization: Bearer forge_live_...`. Org is bound to the token; role is derived from scopes (`admin:all` → owner-level context).
