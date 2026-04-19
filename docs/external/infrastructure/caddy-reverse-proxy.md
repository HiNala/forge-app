# Caddy Reverse Proxy — Reference for Forge

**Version:** 2.x
**Last researched:** 2026-04-19

## What Forge Uses

Caddy for custom domain support with automatic HTTPS via Let's Encrypt.

## On-Demand TLS for Tenant Domains

```caddyfile
# infra/caddy/Caddyfile
{
    on_demand_tls {
        ask http://api:8000/api/v1/domains/verify
        interval 5m
        burst 5
    }
}

# Catch-all for custom domains
:443 {
    tls {
        on_demand
    }
    reverse_proxy web:3000
}

# Default domain
*.forge.app {
    reverse_proxy web:3000
}
```

The `ask` endpoint verifies that a domain belongs to a Forge tenant before issuing a certificate.

## Known Pitfalls

1. **`on_demand_tls`**: Must have an `ask` endpoint to prevent cert issuance for arbitrary domains.
2. **Rate limits**: Let's Encrypt has rate limits. Caddy handles retries.
3. **DNS propagation**: Custom domains take time to propagate.

## Links
- [Caddy Docs](https://caddyserver.com/docs/)
- [On-Demand TLS](https://caddyserver.com/docs/automatic-https#on-demand-tls)
