/** Single source for `NEXT_PUBLIC_API_URL` → `/api/v1` base (server + client). */

export function getApiUrl(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
  )
    .trim()
    .replace(/\/+$/, "");
  // .env.example uses `.../api/v1` — do not append twice.
  if (raw.endsWith("/api/v1")) {
    return raw;
  }
  return `${raw}/api/v1`;
}
