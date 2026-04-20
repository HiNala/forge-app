/**
 * Base URL for `/api/v1` routes. Accepts either an API origin (`http://host:8000`)
 * or a value that already ends with `/api/v1` (see `.env.example` / Docker) without doubling the path.
 */
export function getApiUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_URL;
  const raw = (typeof env === "string" && env.trim() !== "" ? env : "http://localhost:8000").trim();
  const trimmed = raw.replace(/\/+$/, "");
  const origin = trimmed.endsWith("/api/v1") ? trimmed.slice(0, -"/api/v1".length) : trimmed;
  return `${origin.replace(/\/+$/, "")}/api/v1`;
}
