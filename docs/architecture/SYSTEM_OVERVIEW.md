# Forge — system overview

End-state architecture for the Forge monorepo (see [PRD](../plan/02_PRD.md)).

```mermaid
flowchart LR
  subgraph client [Browser]
    Web[Next.js app]
  end
  subgraph edge [Edge]
    Caddy[Caddy / HTTPS]
  end
  subgraph backend [Backend]
    API[FastAPI API]
    Worker[arq worker]
  end
  subgraph data [Data plane]
    PG[(PostgreSQL + RLS)]
    Redis[(Redis)]
    S3[(S3 / MinIO)]
  end
  subgraph external [External APIs]
    Clerk[Clerk]
    LLM[LLM providers]
    Resend[Resend]
    Stripe[Stripe]
    GCal[Google Calendar]
  end
  Web -->|HTTPS JSON + SSE| API
  Web --> Clerk
  API --> PG
  API --> Redis
  API --> S3
  API --> LLM
  API --> Resend
  API --> Stripe
  API --> GCal
  Worker --> Redis
  Worker --> PG
  Worker --> Resend
  Worker --> GCal
```

**Request path (authenticated):** Browser → Next.js → FastAPI `/api/v1/*` with `Authorization: Bearer` (Clerk JWT) and `x-forge-active-org-id` → tenant middleware sets `app.current_tenant_id` → RLS-scoped queries.

**Request path (public page):** Published HTML served from API public runtime → tracker `POST /p/{org}/{page}/track` → `analytics_events`; form `POST /p/{org}/{page}/submit` → `submissions` + automation job enqueue.

**Background:** Worker consumes arq jobs (automations, partition maintenance, etc.) from Redis.
