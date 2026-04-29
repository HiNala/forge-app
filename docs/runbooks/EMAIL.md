# Email (Resend)

## Production setup

1. Create a [Resend](https://resend.com) account and generate an API key.
2. Verify the sending domain (`glidedesign.ai` or `mail.glidedesign.ai`): add DNS records exactly as Resend lists (SPF, DKIM, optional DMARC).
3. Set environment variables on the API service:
   - `RESEND_API_KEY` — secret API key
   - `EMAIL_FROM` — verified sender, e.g. `GlideDesign <noreply@glidedesign.ai>`
   - `RESEND_WEBHOOK_SECRET` — signing secret for `POST /api/v1/webhooks/resend` (Svix-compatible)

## Development

- Without `RESEND_API_KEY`, transactional email calls no-op and automation steps still record as success where no provider is required.
- Use Resend’s test mode / sandbox as documented in their dashboard for safe sends.

## Troubleshooting

- **Bounces / complaints**: inspect Resend dashboard → Logs; webhook handler acknowledges events (delivery analytics expanded in a later milestone).
- **Domain switch**: update `EMAIL_FROM`, re-verify the new domain, and rotate DNS.

## GlideDesign email identity

- Header: GlideDesign horizontal logo centered, 32px height, white background, hairline rule below.
- Body: Inter 500 equivalent at 16px, line-height 1.65, max-width 560px.
- Buttons: violet-coral gradient background, white text, 14px radius.
- Footer: GlideDesign stacked logo, support links, and social links in muted graphite.
- Plain-text fallback: same message, useful subject line, ASCII only.
