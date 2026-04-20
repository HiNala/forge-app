# Caddy Reverse Proxy — Reference for Forge

**Version:** Caddy 2.x  
**Forge:** `infra/caddy/Caddyfile` + `GET /internal/caddy/validate` on the API (`apps/api/app/api/caddy_internal.py`).

## On-demand TLS (custom domains)

Caddy asks the API whether a hostname is allowed **before** issuing a certificate. The API checks `public.forge_caddy_domain_allowed(hostname)` (verified custom domains in Postgres).

```caddyfile
{
	on_demand_tls {
		ask {$CADDY_TLS_ASK_URL}
		interval 2m
		burst 5
	}
}
```

Set `CADDY_TLS_ASK_URL` to the **private** API base, e.g. `http://api.railway.internal:8000/internal/caddy/validate` (Caddy appends `?domain=`).

Optional: set `CADDY_INTERNAL_TOKEN` on the API and send matching `X-Forge-Caddy-Token` on `ask` requests if the route is ever exposed beyond the private network (may require extra Caddy config).

## Managed hostnames (`forge.app`)

- `forge.app` — marketing + app (Next.js upstream).
- `www.forge.app` — 301 to `https://forge.app{uri}`.
- `*.forge.app` — workspace subdomains → same upstream.

## Custom domains

Site block `:443` with `tls { on_demand }` and a matcher that **excludes** `forge.app`, `www.forge.app`, and `*.forge.app`, then `reverse_proxy` to the web service.

## Pitfalls

1. **Rate limits:** Let's Encrypt production rate limits; use staging CA while testing.
2. **Ask endpoint down:** Caddy will not mint certs for custom domains; monitor API health.
3. **DNS:** Custom domains must point to the **Caddy** public endpoint, not `web` directly, if using this topology.

## Links

- [Caddy — On-Demand TLS](https://caddyserver.com/docs/automatic-https#on-demand-tls)
- [Runbook: DEPLOYMENT.md](../../runbooks/DEPLOYMENT.md)
