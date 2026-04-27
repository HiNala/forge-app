# Forge HTTP MCP bridge (P-08)

Forge exposes a **simple HTTP** tool list and synchronous `POST` handler so you can call Forge from automation before a full stdio Model Context Protocol host ships everywhere.

## Endpoints (API base + `/api/mcp/v1`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/mcp/v1/` | None — returns tool manifest (public metadata) |
| POST | `/api/mcp/v1/call` | `Authorization: Bearer` + `x-forge-active-org-id` (same as REST) |

`POST` body:

```json
{ "tool": "forge.list_pages", "arguments": { "limit": 20 } }
```

**Scopes:** today `read:pages` (extend with `mcp:full` when API tokens are upgraded).

## Example (curl)

```bash
curl -sS -X POST "$API/api/mcp/v1/call" \
  -H "Authorization: Bearer $CLERK_JWT" \
  -H "x-forge-active-org-id: $ORG_UUID" \
  -H "Content-Type: application/json" \
  -d '{"tool":"forge.list_pages","arguments":{"limit":5}}'
```

## Cursor / Claude Desktop

Point custom HTTP connectors at the same `POST /api/mcp/v1/call` URL, or wrap with a tiny stdio proxy that maps MCP JSON-RPC to this payload — full stdio MCP is a follow-up.

## Tools shipped in P-08

- `forge.list_pages` — pages in the active org.
- `forge.get_analytics` — stub; use `/api/v1/.../analytics/...` from the app until merged here.

Additions (`forge.create_page`, `forge.update_page`, `forge.list_submissions`, …) follow the same shape.
