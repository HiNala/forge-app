# Launch checklist (GL-04)

Check items when verified — **owner initials + UTC date**. Do not send production traffic from paying accounts until infra rows are backed by evidence (dash screenshot, CLI output pasted in runbooks, audit output).

## Infrastructure & operations (AL-01)

| Item | Verification | Owner | Verified |
|------|----------------|-------|----------|
| Staging `/health/ready` on API OK | Curl + HTTP 200 (`status=ready/not_ready`) | | |
| Production migrations at head (`alembic current`) | `railway run` or CI log | | |
| Postgres backups on | Railway DB dashboard snapshot | | |
| `./scripts/deployment/audit_env.sh production --strict` | CI log from deploy-production workflow succeeds | | |
| `/metrics` not public without Bearer | Probe returns 401 when `METRICS_TOKEN` expected | | |
| `/health/deep` with Bearer yields structured JSON | See [HEALTH_AND_METRICS.md](./runbooks/HEALTH_AND_METRICS.md) | | |
| Incident + deploy runbooks reachable | Links below resolve | | |

## Networking / TLS / DNS

| Item | Verification | Owner | Verified |
|------|----------------|-------|----------|
| `glidedesign.ai`, `www`, `app`, `api`, wildcard per DNS_SETUP | dig + TTL check | | |
| TLS for public hosts | openssl s_client / curl -v | | |

## Secrets & webhooks

| Item | Verification | Owner | Verified |
|------|----------------|-------|----------|
| No wildcards-only CORS/TRUSTED_HOSTS prod | Startup gate rejects | | |
| Stripe live keys + webhook delivery | Stripe dashboard test event receipt | | |
| First-party auth + Google login redirects match prod API base URLs | Sanity signup/login/Google OAuth smoke | | |

## Observability

| Item | Verification | Owner | Verified |
|------|----------------|-------|----------|
| Sentry scrubbing excludes secrets | Automated test `test_sentry_scrubbing.py` | | |

## Product / legal / support (AL-04 owns sign-off)

| Item | Verification | Owner | Verified |
|------|----------------|-------|----------|
| Terms / Privacy URLs live (`/terms`, `/privacy`) | Manual hit | | |
| Support inbox or alias routed | Mailbox test ticket | | |
| Forbidden copy / positioning sweep (mini-app framing; CI `scripts/ci/forbidden_copy_check.mjs`) | CI green + spot-check `/docs/preview` | | |
| **Public `/p/[org]/[slug]` uses normalized `NEXT_PUBLIC_API_URL`** (no `/api/v1/api/v1`) **+ in-app analytics URL** | Vitest `api-url`; `pnpm typecheck`; optional `e2e/public-page-route.spec.ts` | | |
| Settings integrations + roadmap alignment (no “coming soon” without linked roadmap/disposition) | PR link + QA notes | | |
| Billing + canvas destructive actions audited (`pytest ... test_audit_log_completeness`) | pytest | | |

## Operational rhythms

| Item | Verification | Owner | Verified |
|------|----------------|-------|----------|
| On-call rotation roster | Incident tool export | | |
| Deploy + rollback playbook read | ACK in AL-01 report | | |

References: [DEPLOYMENT.md](./runbooks/DEPLOYMENT.md), [GO_LIVE_PLAYBOOK.md](./runbooks/GO_LIVE_PLAYBOOK.md), [DISASTER_RECOVERY.md](./runbooks/DISASTER_RECOVERY.md), [HEALTH_AND_METRICS.md](./runbooks/HEALTH_AND_METRICS.md).

## Sign-off after AL-04

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| Product / business | | |

## Launch decision

**Authority:** primary approver fills name/date when Product + Infra checklist rows are evidenced. Delay launch if Stripe, auth, CSP/sandbox regressions remain open — roll back prior deployment per [ROLLBACK.md](./runbooks/ROLLBACK.md).
