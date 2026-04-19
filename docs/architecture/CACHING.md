# Caching (Redis) — BI-04

All keys are prefixed with `FORGE_CACHE_NS` (default `forge`) from settings so environments can share one Redis without colliding.

| Key pattern | TTL | Invalidate on |
|-------------|-----|----------------|
| `{ns}:prefs:user:{user_id}` | 60s | User preference PATCH |
| `{ns}:org:settings:{org_id}` | 60s | Org settings PATCH |

Reads are wrapped in try/except in helper modules; on Redis failure implementations fall through to the database and log a warning.

Planned expansions (same mission family): `auth:memberships:{user_id}`, `org:{org_id}`, `page:public:{page_id}:{rev}`, `analytics:summary:*`, `availability:*` — see backlog in MISSION_BI_04_REPORT.md.
