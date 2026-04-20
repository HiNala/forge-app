# Publish, cache, and hosting

This runbook describes how Forge serves **live** pages and forms in production: Redis cache, public routes, uploads, rate limits, and custom domains.

## Publish

1. `POST /api/v1/pages/{page_id}/publish` validates HTML, creates a `PageVersion` snapshot, sets `pages.status = live` and `published_version_id`.
2. The API writes a JSON payload to Redis at `page:live:{org_slug}:{page_slug}` (no TTL). The value includes HTML, title, slugs, and plan metadata for the Next.js public renderer and edge caches.
3. `POST .../unpublish` sets the page to `draft` and deletes the Redis key.

On **revert** of a live page, the API refreshes the same Redis key so visitors do not see stale HTML.

## Public traffic

- **Read:** `GET /api/v1/public/pages/{org_slug}/{page_slug}` returns cached JSON (rate-limited by IP).
- **Submit:** `POST /p/{org_slug}/{page_slug}/submit` is mounted outside `/api/v1` so it stays unauthenticated and uses dedicated rate limits.
- **Upload (presigned):** `POST /p/{org_slug}/{page_slug}/upload` returns a short-lived presigned `PUT` URL and a `storage_key`. The browser uploads directly to S3-compatible storage; the submission payload references the key and metadata.

Rate limits (Redis-backed when available):

- Submissions: **10 requests/minute per client IP** and **100 submissions/hour per page** (in addition to IP).
- Public upload requests: **30/minute per IP** (configurable in code).

## Object storage

Presigned URLs use the configured `S3_*` settings (MinIO locally, S3 or R2 in production). Submission files are stored under keys scoped as:

`org/{organization_id}/pages/{page_id}/uploads/{token}/{filename}`.

The API verifies each file on submit (`HEAD` + magic-byte sniff) before persisting `SubmissionFile` rows.

## Custom domains

Verified hostnames are stored in `custom_domains`. The production edge (Caddy) uses an internal `GET /internal/caddy/validate?domain=...` check so TLS certificates are only issued for verified hostnames. The Next.js app resolves `Host` to a page after verification.

## Operations checklist

- Ensure `TRUST_PROXY_HEADERS=true` behind your load balancer so IP-based limits and analytics use the real client IP.
- Ensure Redis is available for publish cache and rate limits; the API degrades to in-process limits when Redis is down (not suitable for multi-instance production).
- Rotate `S3_*` credentials on the same cadence as other application secrets.
