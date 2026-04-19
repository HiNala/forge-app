# GitHub Actions CI — Reference for Forge

**Version:** GitHub Actions
**Last researched:** 2026-04-19

## CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web typecheck
      - run: pnpm --filter web lint
      - run: pnpm --filter web build

  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: forge
          POSTGRES_PASSWORD: forge
          POSTGRES_DB: forge_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v4
        with:
          version: "latest"
      - run: uv sync --frozen
        working-directory: apps/api
      - run: uv run ruff check .
        working-directory: apps/api
      - run: uv run ruff format --check .
        working-directory: apps/api
      - run: uv run pytest tests/ -v
        working-directory: apps/api
        env:
          DATABASE_URL: postgresql+asyncpg://forge:forge@localhost:5432/forge_test
          REDIS_URL: redis://localhost:6379/0

  rls-check:
    runs-on: ubuntu-latest
    needs: backend
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: forge
          POSTGRES_PASSWORD: forge
          POSTGRES_DB: forge
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v4
      - run: uv sync --frozen
        working-directory: apps/api
      - run: uv run alembic upgrade head
        working-directory: apps/api
        env:
          DATABASE_URL: postgresql+asyncpg://forge:forge@localhost:5432/forge
      - run: uv run python scripts/check_rls.py
        working-directory: apps/api
        env:
          DATABASE_URL: postgresql+asyncpg://forge:forge@localhost:5432/forge
```

## Known Pitfalls

1. **Service containers**: PostgreSQL and Redis must be ready before tests run. Use health checks.
2. **pnpm caching**: Use `pnpm/action-setup` for faster installs.
3. **uv caching**: `astral-sh/setup-uv` handles tool installation.
4. **Secrets**: Store API keys in GitHub Secrets, reference as `${{ secrets.KEY }}`.

## Links
- [GitHub Actions Docs](https://docs.github.com/en/actions)
