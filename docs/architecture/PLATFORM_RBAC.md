# Platform RBAC (GL-02)

Forge has two authorization layers:

1. **Tenant (org) roles** — `memberships.role` (`owner` / `editor` / `viewer`). Enforced by PostgreSQL RLS via session GUCs.
2. **Platform roles** — Digital Studio Labs operators. Stored in `platform_*` tables (no RLS). Access is enforced in the API with `require_platform_permission()`.

## Schema

- `platform_permissions` — catalog (`key`, `category`, `description`, `sensitive`).
- `platform_roles` — named bundles (`super_admin`, `admin`, `support`, `analyst`, `billing`, …).
- `platform_role_permissions` — M:N role ↔ permission.
- `platform_user_roles` — user ↔ role, optional `expires_at` for contractors.

Legacy `users.is_admin` is **deprecated** but still honored: when `true`, `load_platform_permissions` returns **all** permission keys (bootstrap / emergency).

## Middleware

- `app/core/platform_auth.py` — `load_platform_permissions(request, user_id)` unions DB grants and caches in Redis (`{FORGE_CACHE_NS}:platform_perms:{user_id}`, 60s TTL).
- `require_platform_permission("orgs:read_list")` — FastAPI dependency; raises `ForgeError` with `code=insufficient_platform_permission` when missing.
- `require_fresh_platform_auth(permission)` — same check plus JWT `iat` within 15 minutes for permissions in `SENSITIVE_PERMISSIONS` (else `code=reauth_required`, HTTP 401).

Clerk JWT `iat` is stored on `request.state.jwt_iat` in `deps/auth.py`.

## Adding a permission

1. Insert into `platform_permissions` (usually a new Alembic migration or one-off SQL).
2. Attach to roles via `platform_role_permissions`.
3. Use `Depends(require_platform_permission("your:key"))` on routes.

## Audit

Platform actions should write `audit_log` rows with `action_context='platform_admin'` and may use `organization_id=NULL` for global events (migration GL-02).
