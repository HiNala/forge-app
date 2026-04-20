# Admin bootstrap (platform Super Admin)

## First Super Admin (database)

1. Identify the Forge user UUID (from `users` or Clerk mapping on `auth_provider_id`).
2. Grant **legacy** `is_admin = true` **or** insert platform roles:

```sql
INSERT INTO platform_user_roles (user_id, role_key)
VALUES ('<uuid>', 'super_admin')
ON CONFLICT DO NOTHING;
```

3. Confirm session:

```bash
curl -sS -H "Authorization: Bearer <jwt>" http://localhost:8000/api/v1/admin/platform/session | jq
```

Expect `permissions` to list the full catalog (legacy admin) or super_admin bundle.

## Redis

Permission cache clears automatically on TTL (60s). After role changes, wait one minute or restart Redis in dev.

## Worker

`llm_cost_daily` materialized view is refreshed every 15 minutes by the worker (`refresh_llm_cost_daily_mv`).
