# Incident response

## Is production healthy?

1. **App URL** — open the marketing and app URLs; confirm 200 responses.
2. **API** — `GET /health` returns `{"status":"healthy"}`; `GET /health/deep` confirms Postgres and Redis (and lists whether Stripe/Resend/OpenAI keys are present — not live calls).
3. **Worker** — confirm the worker container/process is running and processing Redis queue jobs (arq).
4. **Database** — connect with read-only credentials; check recent errors in Postgres logs.

## Roll back a bad deploy

1. **Railway / CI** — redeploy the previous successful Git revision (git SHA) from the hosting dashboard or pipeline.
2. **Database** — if a migration ran, evaluate whether to run `alembic downgrade` for the specific revision (coordinate with engineering; never downgrade blindly if data depends on new columns).

## Logs

- **API / worker** — platform logs (Railway, Docker, or `docker compose logs -f api worker`).
- **Frontend** — Vercel/Railway build logs; browser DevTools for client-only issues.

## Pause email (Resend compromised or abuse)

1. Remove or rotate `RESEND_API_KEY` in the API environment; restart API so sends fail closed or no-op per code paths.
2. In Resend dashboard: pause domain or revoke API keys.
3. Communicate to users if outbound mail was affected.

## Security incident

1. Rotate `SECRET_KEY`, Clerk secrets, Stripe keys, database passwords.
2. Review audit logs and Sentry for unusual spikes.
3. Follow `docs/security/IMPLEMENTATION.md` for control verification after recovery.

## Severity levels

| Level | Meaning | Example |
|-------|---------|---------|
| **SEV1** | Full outage or data loss risk | API down, DB unreachable |
| **SEV2** | Major feature broken | Sign-in, payments, all emails |
| **SEV3** | Degraded / workaround | Single integration, slow Studio |
| **SEV4** | Minor | UI glitch, non-blocking bug |

**Communication:** post to internal channel with summary + ETA; use status page for customer-visible SEV1/2. After resolution, short post-mortem using [FIRST_PRODUCTION_BUG.md](./FIRST_PRODUCTION_BUG.md).

## Related runbooks

- [ONCALL.md](./ONCALL.md) — routing and response times  
- [ROLLBACK.md](./ROLLBACK.md) — deploy rollback  
- [DEPLOYMENT.md](./DEPLOYMENT.md) — normal releases  
