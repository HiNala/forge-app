# Forge admin (operators)

The **Admin** surface (`/admin/*`) is for Digital Studio Labs staff. It uses **platform permissions**, not org roles.

- **Pulse** (`/admin/overview/pulse`) — founder snapshot: users, orgs, LLM spend today.
- **Overview** — same metrics with a bit more context.
- **Organizations** — cross-tenant org list; open a row for detail.
- **LLM & AI spend** — orchestration cost rollups (30-day window by default).

If you see “You don’t have platform access,” your user has no platform roles and `is_admin` is false — ask a Super Admin to grant a role.

Mobile widths are flagged read-only in the shell (`data-admin-readonly`); destructive controls should stay disabled in future iterations.
