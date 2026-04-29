# DNS setup — `glidedesign.ai` (GD-01)

Point DNS at the Railway **Caddy** (or edge) service hostname Railway provides after deploy. Use **DNS only** (no proxy) for ACME HTTP-01 unless you terminate TLS at the proxy with valid certs.

## Staging

| Record | Type | Value |
|--------|------|--------|
| `staging` | CNAME | Railway Caddy service URL (e.g. `xxx.up.railway.app`) |
| `api-staging` | CNAME | Same hostname if Caddy serves `api-staging.glidedesign.ai`; or separate service URL per Railway layout |
| `*.staging` | CNAME | Wildcard for tenant subdomains (optional) |

## Production

| Record | Type | Value |
|--------|------|--------|
| `@` or `glidedesign.ai` | A or CNAME | Per Railway instructions (apex may need A/ALIAS) |
| `www` | CNAME | Same as `@` or Caddy target |
| `api` | CNAME | API or Caddy upstream |
| `*` | CNAME | Wildcard for custom / tenant hosts (on-demand TLS in Caddy) |

## Email (Resend)

Add SPF, DKIM, and DMARC records exactly as Resend shows for `glidedesign.ai` (and staging subdomain if you send from it).

## Verification

```bash
dig +short staging.glidedesign.ai
curl -I https://staging.glidedesign.ai
```

TLS should succeed within a minute of DNS propagation when Caddy or Railway-managed TLS is configured.
