# Health checks and Prometheus metrics

**Last verified date:** not yet executed against production — run after staging deploy under AL-01.

## Endpoints

| Path | Auth | Railway use |
|------|------|-------------|
| `GET /health/live` | none | Kubernetes/Railway **liveness** — process is up |
| `GET /health/ready` | none | **Readiness** — Postgres reachable; Redis may be unavailable and still reports `ready` (legacy compatibility) |
| `GET /health/deep` | `Authorization: Bearer <METRICS_TOKEN>` when token is configured (same behavior as `/metrics`) | Operational deep drill — Postgres, Redis, S3/R2 smoke, Stripe, Resend, auth config, OpenAI nano-probe (cached ~5min in Redis), arq queue depth |
| `GET /metrics` | Bearer token when `METRICS_TOKEN` is set | Prometheus scrape |

Deep health JSON shape:

```json
{
  "status": "ok" | "degraded" | "error",
  "checks": {
    "postgres": { "status": "ok", "latency_ms": 12.3, "message": "…" },
    "redis": { "status": "ok", "latency_ms": 4.1, "message": "…" }
  }
}
```

Interpretation:

- **error** — Postgres failed, or Redis is required but failing (Redis client wired but ping/sentinel failed).
- **degraded** — Core DB/Redis baseline OK but optional integration failed (Stripe, S3 head, auth config, OpenAI ping, …), **or** Redis client never connected at startup (skipped) — investigate pool startup.
- **ok** — All checks succeeded within budgets.

Approximate latency budgets (per subsystem): Postgres &lt; 3s, Redis &lt; 2s, S3 head &lt; 5s, Stripe SDK &lt; 5s, outbound HTTP probes &lt; 8s. Total wall-clock is parallel — expect &lt; ~15s worst case excluding cold OpenAI cache.

OpenAI completes are **cached for 300s** in Redis under `{FORGE_CACHE_NS}:health:llm:openai:ping` to avoid quota burn.

## Escalation

| Symptom | Likely cause | Action |
|---------|----------------|--------|
| `/metrics` or `/health/deep` 401 | Missing or rotated `METRICS_TOKEN` | Rotate token in Vault/Railway; update scrapers/monitors |
| `postgres` error | Connection string, RDS outage, firewall | Check `DATABASE_URL`, Railway DB status, PG logs |
| `redis` error | Redis outage, eviction | Check `REDIS_URL`, memory policy [ENVIRONMENTS.md](./ENVIRONMENTS.md) |
| `s3` degraded | Wrong creds/R2 outage | Rotate keys; verify bucket/region endpoint |
| `stripe` degraded | Stripe incident or disabled key | Status page; verify `sk_live_` |

## Verification

From an operator workstation:

```bash
curl -sS -H "Authorization: Bearer $METRICS_TOKEN" "$API_URL/health/deep" | jq .
```

`/metrics`:

```bash
curl -fsS -H "Authorization: Bearer $METRICS_TOKEN" "$API_URL/metrics" | head
```
