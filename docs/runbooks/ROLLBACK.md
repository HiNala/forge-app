# Rollback a deploy (Railway)

## Application rollback

1. In Railway, open the **previous successful deployment** for the affected service.
2. **Redeploy** that revision (one-click rollback in the dashboard).
3. Verify `/health` and `/health/deep` on the rolled-back revision.

Rollback restores **application code + container image**, not database state.

## Database / migrations

- **Reversible migrations:** only if Alembic `downgrade` was tested; run `alembic downgrade -1` from a one-off job **only** with approval.
- **Destructive migrations** (column drops, data transforms): **do not** auto-downgrade. Fix forward with a new migration or restore from backup.

## When rollback is not enough

- Bad data written to Postgres → restore from [DATABASE.md](./DATABASE.md) backup.
- Secrets leaked → rotate keys in Railway + providers (Stripe, Clerk, etc.).
