# Email (Resend)

## Production setup

1. Create a [Resend](https://resend.com) account and generate an API key.
2. Verify the sending domain (e.g. `forge.app`): add DNS records exactly as Resend lists (SPF, DKIM, optional DMARC).
3. Set environment variables on the API service:
   - `RESEND_API_KEY` — secret API key
   - `EMAIL_FROM` — verified sender, e.g. `Forge <noreply@forge.app>`
   - `RESEND_WEBHOOK_SECRET` — signing secret for `POST /api/v1/webhooks/resend` (Svix-compatible)

## Development

- Without `RESEND_API_KEY`, transactional email calls no-op and automation steps still record as success where no provider is required.
- Use Resend’s test mode / sandbox as documented in their dashboard for safe sends.

## Troubleshooting

- **Bounces / complaints**: inspect Resend dashboard → Logs; webhook handler acknowledges events (delivery analytics expanded in a later milestone).
- **Domain switch**: update `EMAIL_FROM`, re-verify the new domain, and rotate DNS.
