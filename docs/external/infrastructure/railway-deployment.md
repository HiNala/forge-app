# Railway Deployment — Reference for Forge

**Version:** Railway Platform
**Last researched:** 2026-04-19

## Services to Deploy

| Service | Source | Build |
|---------|--------|-------|
| web | apps/web/Dockerfile | Node.js |
| api | apps/api/Dockerfile | Python |
| worker | apps/api/Dockerfile (different CMD) | Python |
| postgres | Railway managed | PG 16 |
| redis | Railway managed | Redis 7 |

## railway.json

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": { "builder": "DOCKERFILE" },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

## Private Networking

Railway provides internal DNS:
- `postgres.railway.internal:5432`
- `redis.railway.internal:6379`
- `api.railway.internal:8000`

Use internal URLs for service-to-service communication. Only expose `web` and `api` publicly.

## Custom Domains

1. Add custom domain in Railway dashboard
2. Point DNS CNAME to Railway's domain
3. Railway handles SSL automatically

## Environment Variables

Set per-service in Railway dashboard or via CLI:
```bash
railway variables set OPENAI_API_KEY=sk-...
```

## Known Pitfalls

1. **Dockerfile builds**: Railway supports Dockerfile builds natively. Specify `builder: DOCKERFILE`.
2. **Health checks**: Configure health check path for zero-downtime deploys.
3. **File storage**: Use S3/R2 in production, not MinIO.
4. **Costs**: Railway charges per resource usage. Monitor with their dashboard.

## Links
- [Railway Docs](https://docs.railway.com)
- [Dockerfile Deploy](https://docs.railway.com/guides/dockerfiles)
