# Forge — AI-Powered Mini-App Builder

Forge turns a plain-English prompt into a finished, hosted, single-purpose web page — a booking form, a contact form, an event RSVP, a daily menu, a sales proposal — and gives the creator an admin surface to manage it afterward.

## Quick Start

```bash
# Clone and start all services
git clone https://github.com/HiNala/forge-app.git
cd forge-app
cp .env.example .env
docker compose up --build -d
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 async |
| Database | PostgreSQL 16 (RLS), Redis 7 |
| Storage | MinIO (local) / S3 (production) |
| AI | OpenAI, Anthropic, Google Gemini (provider-abstracted) |
| Email | Resend |
| Billing | Stripe |
| Deploy | Docker, Railway |

## Repository Structure

```
forge-app/
├── apps/
│   ├── web/          # Next.js 16 frontend
│   ├── api/          # FastAPI backend
│   └── worker/       # Background job worker
├── packages/         # Shared code (types, eslint config)
├── docs/             # Documentation & architecture decisions
├── infra/            # Railway, Caddy configs
└── docker-compose.yml
```

## Documentation

See `docs/` for architecture decisions, external library references, and runbooks.

## License

Proprietary — Digital Studio Labs
