# GlideDesign Domain Setup

This runbook documents the production domain model for the GlideDesign rebrand.

## Domains

| Host | Purpose |
|---|---|
| `glidedesign.ai` | Marketing site |
| `app.glidedesign.ai` | Authenticated app |
| `api.glidedesign.ai` | API service |
| `*.glidedesign.ai` | Custom domains or platform-routed public pages, depending on deployment mode |

## DNS Checklist

1. Point the apex `glidedesign.ai` at the web deployment provider.
2. Point `app.glidedesign.ai` at the authenticated web app deployment if split from marketing.
3. Point `api.glidedesign.ai` at the API service.
4. Configure wildcard routing only after custom-domain routing is ready.
5. Enable HTTPS and verify certificate issuance for every host.
6. Preserve path and query string redirects from any legacy public Forge domain if that domain was already public.

## Application Environment

Preferred new variables:

- `NEXT_PUBLIC_SITE_URL=https://glidedesign.ai`
- `NEXT_PUBLIC_APP_URL=https://app.glidedesign.ai`
- `NEXT_PUBLIC_API_URL=https://api.glidedesign.ai`
- `TRUSTED_HOSTS=glidedesign.ai,app.glidedesign.ai,api.glidedesign.ai,*.glidedesign.ai`
- `EMAIL_FROM=GlideDesign <noreply@glidedesign.ai>`
- `GLIDEDESIGN_OPERATOR_ORG_IDS=<operator org UUIDs>`
- `GLIDEDESIGN_CACHE_NS=glidedesign`

Compatibility note: legacy `FORGE_*` variables remain accepted during the aesthetic rebrand for deployed environments, API headers, Stripe meter names, and cache namespaces. Prefer the `GLIDEDESIGN_*` aliases for new installs where both are available, and do not remove legacy names without a coordinated migration.

## Email Domain

Use Resend with `glidedesign.ai` or `mail.glidedesign.ai`.

Required DNS:

- SPF record from Resend.
- DKIM records from Resend.
- DMARC record with at least monitoring policy before launch.

## Stripe Branding

In Stripe Dashboard, set:

- Brand name: `GlideDesign`
- Support email: `hello@glidedesign.ai`
- Accent color: brand violet
- Button style: violet/coral where Stripe permits; otherwise brand violet
- Logo: GlideDesign horizontal lockup or mark

## Manual External Checklist

- DNS records applied and verified.
- Resend domain verified.
- Stripe Checkout and Portal brand updated.
- OAuth consent screens updated to GlideDesign.
- GitHub repository description updated manually.
- Old domain redirects configured if legacy domain was public.
