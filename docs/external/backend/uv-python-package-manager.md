# uv — Python Package Manager — Reference for Forge

**Version:** 0.6.x
**Last researched:** 2026-04-19

## What Forge Uses

uv for Python dependency management in the backend. Replaces pip/pip-tools. Faster installs, reproducible lockfiles, built-in virtual environment management.

## Common Commands

```bash
# Initialize a new project
uv init --python 3.12

# Add dependencies
uv add fastapi uvicorn sqlalchemy asyncpg pydantic

# Add dev dependencies
uv add --dev pytest ruff mypy

# Sync (install from lockfile)
uv sync

# Sync without dev deps (production)
uv sync --frozen --no-dev

# Run a command in the venv
uv run python -m pytest
uv run uvicorn app.main:app --reload

# Update a specific package
uv add fastapi@latest

# Show installed packages
uv pip list
```

## Dockerfile Pattern

```dockerfile
FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy dependency files first (layer caching)
COPY pyproject.toml uv.lock ./

# Install dependencies (no dev deps in production)
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Run
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## pyproject.toml Structure

```toml
[project]
name = "forge-api"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.136.0",
    "uvicorn[standard]>=0.34.0",
    "sqlalchemy[asyncio]>=2.0.40",
    "asyncpg>=0.30.0",
    "alembic>=1.14.0",
    "pydantic>=2.10.0",
    "pydantic-settings>=2.7.0",
    "httpx>=0.28.0",
    "redis>=5.2.0",
    "arq>=0.28.0",
    "litellm>=1.83.0",
    "resend>=2.0.0",
    "stripe>=11.0.0",
    "sentry-sdk[fastapi]>=2.0.0",
    "python-multipart>=0.0.18",
    "sse-starlette>=2.2.0",
    "python-jose[cryptography]>=3.3.0",
]

[tool.uv]
dev-dependencies = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "ruff>=0.8.0",
    "mypy>=1.13.0",
    "httpx>=0.28.0",
]
```

## Known Pitfalls

1. **`uv.lock` must be committed**: It's the lockfile for reproducible builds.
2. **`--frozen` in CI/Docker**: Prevents lockfile updates during installs.
3. **Python version**: Specify in `pyproject.toml` and Dockerfile. Keep in sync.

## Links
- [uv Docs](https://docs.astral.sh/uv/)
