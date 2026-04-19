# Docker Best Practices — Reference for Forge

**Version:** Docker 27.x
**Last researched:** 2026-04-19

## Multi-Stage Builds

### Python/FastAPI Backend
```dockerfile
# apps/api/Dockerfile
FROM python:3.12-slim AS base
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app

FROM base AS deps
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

FROM base AS dev
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen
COPY . .
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM base AS production
COPY --from=deps /app/.venv /app/.venv
COPY . .
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Next.js Frontend
```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

## .dockerignore

```
node_modules
.next
__pycache__
.venv
.git
*.md
docs/
```

## Known Pitfalls

1. **Layer caching**: Copy dependency files BEFORE source code. Dependencies change less often.
2. **`output: standalone`**: Required in `next.config.ts` for the standalone Docker build.
3. **Non-root user**: Run containers as non-root in production.

## Links
- [Docker Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
