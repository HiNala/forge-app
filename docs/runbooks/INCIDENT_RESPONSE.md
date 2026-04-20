# Incident response (GL-04)

Quick reference when something breaks in production.

## LLM cost or error spike

1. Check Sentry for provider errors and rate limits.
2. In Railway logs, filter `llm` / `openai` / `anthropic`.
3. Toggle `LLM_FALLBACK_MODELS` or reduce `STUDIO_GENERATE_PER_MINUTE_*` via env (requires redeploy).
4. If abuse suspected: tighten WAF/rate limits at Caddy or API middleware.

## Email not delivering (Resend)

1. Verify domain DNS (SPF, DKIM, DMARC) in Resend dashboard.
2. Check `RESEND_API_KEY` and `EMAIL_FROM` in Railway.
3. Inspect worker logs for automation/email jobs.

## Webhooks flapping (Stripe)

1. Stripe Dashboard → Webhooks → delivery logs.
2. Confirm `STRIPE_WEBHOOK_SECRET` matches the endpoint signing secret.
3. Check API logs for `stripe` / `webhook` and 4xx/5xx.

## Elevated 5xx

1. Railway service health and recent deploys — **rollback** if correlated.
2. Postgres connection saturation: scale API replicas or pool size (careful).
3. Redis down: API may degrade; restore Redis plugin.

## Customer-reported tenant data leak (suspected)

1. Treat as **P0**: preserve logs, avoid destructive changes.
2. Run RLS audit scripts and isolate affected org IDs.
3. Follow legal/comms process per company policy.
