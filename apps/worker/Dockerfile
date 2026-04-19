FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app/api
COPY apps/api/pyproject.toml apps/api/uv.lock ./
RUN uv sync --frozen --no-dev
COPY apps/api/ ./
COPY apps/worker/worker.py ../worker.py
ENV PYTHONPATH=/app
WORKDIR /app/api
CMD ["uv", "run", "arq", "worker.WorkerSettings"]
