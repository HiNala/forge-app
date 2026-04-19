# `apps/api` tests

| Location | Purpose |
|----------|---------|
| **`support/`** | Shared helpers: `require_postgres()`, `forge_test_headers`, `VALID_PUBLISHABLE_HTML` |
| **`user_flows/`** | End-to-end behavior from **visitor / creator / teammate** perspectives (needs Postgres unless noted); includes **page PATCH/DELETE**, **empty list + versions**, RBAC, submissions, **CSV export**, pagination |
| **`test_*.py`** (root) | Focused unit or integration tests by area (health, RLS, orchestration, **queue enqueue**, billing, …) |

Run from `apps/api`:

```bash
uv run alembic upgrade head   # keep DB schema in sync with models (required for integration tests)
uv run pytest tests/
```

If `uv` cannot recreate `.venv` on Windows, use e.g. `UV_PROJECT_ENVIRONMENT=.venv-forge` before `uv sync`.
