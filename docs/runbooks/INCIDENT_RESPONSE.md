# Incident response

Operational playbook for on-call and maintainers when production misbehaves.

## 1. Is production healthy?

1. **App liveness:** `GET https://<api-host>/health/live` → `{"status":"ok"}`.
2. **Readiness:** `GET https://<api-host>/health/ready` — Postgres must be `ok`; Redis may be `unavailable` only if you explicitly run without Redis (not recommended).
3. **Deep check:** `GET https://<api-host>/health/deep` — same plus non-sensitive integration hints in non-production; in production, only infra checks are listed.
4. **Frontend:** Load the marketing URL and a signed-in dashboard route; verify Clerk sign-in works.
5. **Worker:** Confirm worker process is running (Railway/metrics/logs); queue depth in Redis if instrumented.

## 2. Roll back a bad deploy

**Railway / container hosts**

1. Open the hosting dashboard → **Deployments**.
2. Select the last known-good deployment → **Rollback** or **Redeploy** previous image/commit.
3. Verify `/health/ready` and a smoke path (login → dashboard).

**Database migrations**

- If a migration caused the incident: restore DB from snapshot (if available), or fix-forward with a new migration **after** stabilizing the app version.
- CI enforces `alembic downgrade base && upgrade head` for drift; production rollbacks of schema are risky—prefer forward fixes unless the team agrees.

## 3. Logs

- **API / worker:** Platform logs (Railway, Docker, etc.); search by `request_id` when present in JSON logs.
- **Web:** Vercel/Railway Next.js logs for SSR errors.
- **Sentry:** Error grouping, release tags, user/org context (scrub PII per `before_send` rules).

## 4. Pause email (Resend compromised or bad blast)

1. **Rotate** `RESEND_API_KEY` in the provider dashboard and in secrets; redeploy API + worker.
2. **Disable automations** at the source if needed: feature-flag or temporary code path (coordinate with engineering).
3. **Queue:** Inspect Redis `arq` queues; drain or pause workers if messages must not send.

## 5. Pause billing (Stripe)

- Use Stripe Dashboard to **pause** subscriptions or **disable** checkout links if fraud is suspected.
- Webhooks will still arrive; verify `STRIPE_WEBHOOK_SECRET` after any dashboard rotation.

## 6. Security incident shortcuts

- **JWT compromise:** Rotate Clerk keys / sessions from Clerk Dashboard; invalidate sessions if required.
- **Leaked API secret:** Rotate `SECRET_KEY`, `METRICS_TOKEN`, `CADDY_INTERNAL_TOKEN`, database credentials, S3 keys, Stripe keys as applicable; redeploy all services.

## 7. Communications

- Post an internal status note with: impact, mitigations, ETA, owner.
- For user-visible outages, use your status page or in-app banner (if configured).

## 8. Post-incident

- Short **retrospective**: root cause, detection gap, action items (tests, alerts, runbook updates).
