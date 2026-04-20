FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY . .
# Production (GL-04): run migrations explicitly (`railway run -- alembic upgrade head`), not on every boot.
# Local dev overrides this in docker-compose.yml with reload + optional migrate.
CMD ["sh", "-c", "uv run --no-dev uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
