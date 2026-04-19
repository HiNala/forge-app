# Support playbook (BI-04)

## User cannot save preferences

1. Confirm `PATCH /api/v1/auth/me/preferences` returns 400 `org_not_specified` for multi-org users without `X-Forge-Active-Org-Id`.
2. Check API logs for `preferences_updated` audit rows.
3. Redis optional — cache miss should still read Postgres.

## Custom domain stuck in pending

1. DNS: `_forge-verify.{hostname}` TXT must contain the `verification_token` returned when the domain row was created.
2. Call `POST /api/v1/org/custom-domains/{id}/verify` after DNS propagates.
3. Caddy ask: `GET /internal/caddy/validate?domain=` — must return 200 after `verified_at` is set (existing Mission 08 function).

## API token rejected

1. Full secret is shown only once on create. Prefix is first 8 chars of the random segment after `forge_live_`.
2. Hash stored is `SHA-256` of the **entire** `forge_live_...` string bytes.

## Submissions not visible

Unrelated to settings; check tenant headers, RLS GUCs, and published page + submission flow. Re-run failing test in isolation (some flows are timing-sensitive on Windows).
