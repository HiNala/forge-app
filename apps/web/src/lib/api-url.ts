/**
 * Base URL for JSON API calls (`/api/v1`).
 * `NEXT_PUBLIC_API_URL` may be:
 * - bare origin: `http://localhost:8000`
 * - origin with API prefix (production docs): `https://api.glidedesign.ai/api/v1` or trailing slash variants
 *
 * Always normalizes so callers never produce `/api/v1/api/v1/...` (audit P0).
 */
export function normalizeApiOrigin(envValue: string | undefined): string {
  let base = (envValue ?? "http://localhost:8000").trim();
  base = base.replace(/\/+$/, "");
  base = base.replace(/\/?api\/v1$/i, "");
  base = base.replace(/\/+$/, "");
  return base || "http://localhost:8000";
}

/** Single canonical JSON API prefix for this deployment. */
export function getApiUrl(): string {
  return `${normalizeApiOrigin(process.env.NEXT_PUBLIC_API_URL)}/api/v1`;
}

export function getPublicPageApiUrl(orgSlug: string, pageSlug: string): string {
  return `${getApiUrl()}/public/pages/${encodeURIComponent(orgSlug)}/${encodeURIComponent(pageSlug)}`;
}

/** Authenticated analytics batch ingest (`POST /api/v1/analytics/track`). */
export function getAnalyticsTrackUrl(): string {
  return `${getApiUrl()}/analytics/track`;
}
