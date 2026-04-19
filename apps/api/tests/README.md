# `apps/api` tests

| Location | Purpose |
|----------|---------|
| **`support/`** | Shared helpers: `require_postgres()`, `forge_test_headers`, `VALID_PUBLISHABLE_HTML` |
| **`user_flows/`** | End-to-end behavior from **visitor / creator / teammate** perspectives (needs Postgres unless noted); includes submissions list, **CSV export**, pagination |
| **`test_*.py`** (root) | Focused unit or integration tests by area (health, RLS, orchestration, billing, …) |

Run from `apps/api`:

```bash
uv run pytest tests/
```

If `uv` cannot recreate `.venv` on Windows, use e.g. `UV_PROJECT_ENVIRONMENT=.venv-forge` before `uv sync`.
