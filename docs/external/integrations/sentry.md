# Sentry — Reference for Forge

**Version:** sentry-sdk 2.x (Python), @sentry/nextjs (JS)
**Last researched:** 2026-04-19

## Backend (FastAPI)

```python
# In app/main.py lifespan
import sentry_sdk

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    environment=settings.ENVIRONMENT,
    traces_sample_rate=0.1,  # 10% of requests
    profiles_sample_rate=0.05,
)
```

FastAPI integration is automatic with `sentry-sdk[fastapi]`.

## Frontend (Next.js)

```bash
pnpm add @sentry/nextjs
pnpm dlx @sentry/wizard@latest -i nextjs
```

## Known Pitfalls

1. **No PII in error payloads**: Scrub emails, names from Sentry events.
2. **Source maps**: Upload source maps in CI for readable stack traces.
3. **Tenant context**: Set user + org context on each request for better debugging.

## Links
- [Sentry Python](https://docs.sentry.io/platforms/python/integrations/fastapi/)
- [Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
