# Launch checklist (GL-04)

Check items and add **date / initials** when verified. Do not launch production traffic for paying customers until technical items are complete.

## Technical

- [ ] Staging: all services healthy; `/health/ready` OK on API.
- [ ] **API production env:** `ENVIRONMENT=production` — app refuses to boot with `TRUSTED_HOSTS=*`, empty `CLERK_JWKS_URL`, `AUTH_TEST_BYPASS=true`, non-empty `FORGE_E2E_TOKEN`, weak/short `SECRET_KEY` (≥32 chars, not a documented placeholder — see `app/config.py`).
- [ ] **Edge:** `TRUSTED_HOSTS` lists real API hostnames; `BACKEND_CORS_ORIGINS` lists only real web origins.
- [ ] **Metrics:** Either keep `/metrics` on a private network only, or set `METRICS_TOKEN` and configure scrapers with `X-Metrics-Token`.
- [ ] Production: migrations applied; backups enabled.
- [ ] DNS: `forge.app`, `www`, `api`, wildcard per [DNS_SETUP.md](./deployment/DNS_SETUP.md).
- [ ] TLS: valid certificates; Caddy on-demand `ask` tested for custom domains.
- [ ] Secrets: `./scripts/deployment/audit_env.sh production` passes (or manual review documented).
- [ ] Stripe: live webhook endpoint + signing secret; test event received.
- [ ] Resend: verified sending domain; test message received.
- [ ] OAuth: Google redirect URIs match `API_BASE_URL` for production.
- [ ] Sentry: DSN set for api/web/worker as applicable.
- [ ] CI: deploy workflows reviewed; production deploy requires manual confirmation.

## Product / legal

- [ ] Terms and Privacy published (`/terms`, `/privacy`).
- [ ] Support inbox or alias configured (e.g. `support@forge.app`).

## Operational

- [ ] On-call rotation and escalation path defined.
- [ ] Runbooks linked: [DEPLOYMENT.md](./runbooks/DEPLOYMENT.md), [GO_LIVE_PLAYBOOK.md](./runbooks/GO_LIVE_PLAYBOOK.md), [DISASTER_RECOVERY.md](./runbooks/DISASTER_RECOVERY.md).
- [ ] **Mission 08:** Staging deploy after green CI; production deploy behind GitHub Environment approval.
- [ ] **Mission 08:** Post-deploy smoke (health, optional API `/health/deep`) passes; Sentry test event received.
- [ ] **Mission 08:** Custom domain E2E on real hostname; Caddy `ask` returns 200 only for verified domains.
- [ ] **Mission 08:** Rollback tested on staging; backup restore tested on a schedule.
- [ ] **Mission 08:** Alerts route to Slack/Discord + on-call email; test alert fired once.
- [ ] **Mission 08:** `robots.txt` / `sitemap.xml` verified on production marketing host.
- [ ] **Mission 08:** Dogfooding org seeded; Brian Owner (internal).

## Sign-off

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| Product / business | | |
