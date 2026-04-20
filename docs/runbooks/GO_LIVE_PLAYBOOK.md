# Go-live playbook (GL-04)

Use this on launch day after staging has been stable and DNS/TLS are verified.

## Preconditions

- [ ] `main` is green (CI: API tests, web lint/typecheck, RLS check).
- [ ] Staging smoke: sign-in, Studio generate, publish, public page, Stripe test webhook.
- [ ] `docs/LAUNCH_CHECKLIST.md` items checked through “technical readiness.”

## Timeline (indicative)

| Step | Duration | Owner |
|------|----------|--------|
| Freeze `main` (no unrelated merges) | — | Eng |
| Tag release candidate `vX.Y.Z-rc1` | 2 min | Eng |
| Deploy production (manual approval workflow or Railway dashboard) | 5–20 min | Eng |
| Run migrations `alembic upgrade head` | 2–10 min | Eng |
| Smoke: `GET /health/ready`, home, sign-in | 5 min | Eng |
| Stripe live webhook test event (small amount) | 5 min | Eng |
| Monitor Sentry / Railway logs | 30 min | On-call |

## Commands

```bash
railway environment use production
railway run --service api uv run alembic upgrade head
```

Rollback: [DEPLOYMENT.md](./DEPLOYMENT.md) and Railway “previous deployment” UI or `railway redeploy --previous` when supported.

## Communication

- Post to internal channel: start time, expected duration, rollback owner.
- If any smoke step fails, stop and roll back before announcing.
