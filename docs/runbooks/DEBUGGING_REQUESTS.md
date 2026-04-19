# Debugging API requests (support & on-call)

## Request ID

Every response includes `X-Request-ID` (also mirrored from `X-Request-ID` on the request when sent by a proxy). Logs under structured logging (`structlog`) include the same `request_id` on `http.request.started` and `http.request.finished`.

1. Ask the customer for the **exact** `X-Request-ID` from their browser Network tab or client logs.
2. Search API logs for that string (JSON logs in production, keyed `request_id` or nested under event fields depending on export).
3. Correlate with the same window in **Sentry** (if `SENTRY_DSN` is configured): events are tagged with `organization_id` when a tenant session was established, and user context is set once `get_db` runs for authenticated routes.

## Common failure shapes

| Symptom | Likely cause | Where to look |
|--------|----------------|---------------|
| `401` + `detail` string | Missing/invalid `Authorization: Bearer` | Clerk JWKS / JWT expiry; test bypass headers only in `ENVIRONMENT=test` |
| `400` + `org_not_specified` | Multi-org user without `x-forge-active-org-id` | Frontend org switcher |
| `403` + `not_a_member` | User not in org from header | `memberships` row, invitations |
| `429` + `rate_limited` | Redis-backed limiter (or in-process fallback) | Per-user bearer hash, per-IP for anonymous `/api/v1/*` |
| `422` + `validation_error` | Pydantic body/query | Flattened `extra.fields` in response body |
| `413` | Body over 10 MiB (25 MiB for `/api/v1/uploads/*`) | Large uploads; use presigned multipart |

## Sentry scrubbing

If `SENTRY_DSN` is set (recommended in production), `app.core.sentry.init_sentry` registers FastAPI/Starlette integrations. `before_send` scrubs `Authorization`, `Cookie`, and header keys matching password/secret/token. User id and `organization_id` are set when `get_db` runs.

## OpenAPI / types

Regenerate the committed snapshot after API changes:

```bash
cd apps/api && uv run python scripts/export_openapi.py openapi.json
cd ../web && pnpm run codegen:api
```

CI fails if generated output drifts from what is committed.
