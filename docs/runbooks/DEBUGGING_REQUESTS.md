# Debugging API requests (support)

## Request ID

Every response includes **`X-Request-ID`** (or echoes the client’s `X-Request-ID`). Logs emitted during the request include the same id via structlog contextvars.

1. Ask the user for the **request id** and approximate **timestamp (UTC)**.
2. In log search (Railway, Datadog, etc.), filter: `request_id=<uuid>` and optionally `path` / `http.request.finished`.
3. Correlate with application errors; in production, **5xx** JSON may only expose `request_id` — use that id when opening incidents.

## Common failures

| Symptom | Checks |
|--------|--------|
| `400` + `org_not_specified` | Multi-org user omitted **`X-Forge-Active-Org-Id`** (or alias `X-Active-Org`). |
| `403` + `not_a_member` | User not in org for the resolved id. |
| `401` | Missing/invalid Clerk JWT; test mode requires `x-forge-test-user-id` when `AUTH_TEST_BYPASS=true`. |
| `429` + `rate_limited` | Confirm Redis is up; limits are per-IP or per bearer hash (see `app.middleware.rate_limit`). |
| `413` | Body over 10 MiB (or 25 MiB on upload routes). |

## Sentry

If `SENTRY_DSN` is set (recommended in production), unhandled exceptions attach `request_id` and user context when `get_db` has run. Scrub sensitive headers centrally in Sentry `before_send` when enabled.
