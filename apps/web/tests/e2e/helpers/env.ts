/**
 * GL-03 — URLs for E2E against docker-compose.ci (or local dev).
 * Override with env vars in CI.
 */

export function apiBaseUrl(): string {
  return (
    process.env.PLAYWRIGHT_API_URL ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ??
    "http://127.0.0.1:8000"
  );
}

export function apiV1Url(): string {
  const base = apiBaseUrl().replace(/\/$/, "");
  return `${base}/api/v1`;
}

export function mailpitApiUrl(): string {
  return process.env.PLAYWRIGHT_MAILPIT_URL ?? "http://127.0.0.1:8025";
}

export function e2eSeedToken(): string {
  const t = process.env.FORGE_E2E_TOKEN;
  if (!t) {
    throw new Error("FORGE_E2E_TOKEN is required for createTestOrg()");
  }
  return t;
}
