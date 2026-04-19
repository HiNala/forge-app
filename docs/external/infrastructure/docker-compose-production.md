# Docker Compose — Reference for Forge

**Version:** Docker Compose v2
**Last researched:** 2026-04-19

## Development Compose

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: forge
      POSTGRES_PASSWORD: forge
      POSTGRES_DB: forge
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U forge"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio-setup:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 minioadmin minioadmin;
      mc mb --ignore-existing local/forge-uploads;
      exit 0;
      "

  api:
    build:
      context: ./apps/api
      target: dev
    ports:
      - "8000:8000"
    volumes:
      - ./apps/api:/app
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file: .env
    command: >
      sh -c "uv run alembic upgrade head &&
             uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

  worker:
    build:
      context: ./apps/api
      target: dev
    volumes:
      - ./apps/api:/app
    depends_on:
      redis:
        condition: service_healthy
    env_file: .env
    command: uv run arq app.workers.worker.WorkerSettings

  web:
    build:
      context: ./apps/web
      target: dev
    ports:
      - "3000:3000"
    volumes:
      - ./apps/web:/app
      - /app/node_modules
    depends_on:
      - api
    env_file: .env
    command: pnpm dev --port 3000

volumes:
  pgdata:
  minio-data:
  redis-data:
```

## Known Pitfalls

1. **`condition: service_healthy`**: Ensures dependencies are ready before dependents start.
2. **Volume mounting**: Mount source code for hot-reload in dev. Exclude `node_modules` with anonymous volume.
3. **`env_file`**: Loads from `.env`. Don't commit `.env` — use `.env.example` as template.

## Links
- [Docker Compose Docs](https://docs.docker.com/compose/)
