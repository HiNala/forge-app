# Launch checklist (GL-04)

Check items and add **date / initials** when verified. Do not launch production traffic for paying customers until technical items are complete.

## Technical

- [ ] Staging: all services healthy; `/health/ready` OK on API.
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

## Sign-off

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| Product / business | | |
