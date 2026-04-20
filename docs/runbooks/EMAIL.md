# Email (Resend)

## Setup

1. Create a [Resend](https://resend.com) account and add your sending domain (e.g. `forge.app`).
2. Add the DNS records Resend provides (SPF, DKIM, optional DMARC). Wait for verification.
3. Set in the API environment:
   - `RESEND_API_KEY` — API key with send permission.
   - `EMAIL_FROM` — verified sender, e.g. `Forge <notifications@forge.app>`.
   - `RESEND_WEBHOOK_SECRET` — for `POST /api/v1/webhooks/resend` (Svix signing secret from Resend).

## Sandbox vs production

- Development can omit `RESEND_API_KEY`; the API logs and skips sends.
- Staging/production must use real keys; rotate keys on the same schedule as other secrets.

## Troubleshooting

- **Bounces / complaints:** Inspect Resend dashboard → Messages; webhook events are logged (delivery analytics can be extended in-app).
- **Domain change:** Verify the new domain in Resend, update `EMAIL_FROM`, then roll DNS.
- **Rate limits:** Transient Resend errors trigger automation retries with backoff in the worker.
