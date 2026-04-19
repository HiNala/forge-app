# Forge — AI-Powered Mini-App Builder

Forge turns a plain-English prompt into a finished, hosted, single-purpose web page — a booking form, a contact form, an event RSVP, a daily menu, a sales proposal — and gives the creator an admin surface to manage it afterward.

## Quick Start

```bash
# Clone and start all services
git clone https://github.com/HiNala/forge-app.git
cd forge-app
cp .env.example .env
# Add Clerk keys (see .env.example) for sign-in; optional: Resend + S3 for invites/logo.
docker compose up --build -d
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### Signup → onboarding → brand (Mission 02)

1. **Sign up** with Clerk (`/signup`); the app calls `POST /api/v1/auth/signup` to create the Forge `User`, default **Organization**, and **Owner** membership.
2. Complete **onboarding** (`/onboarding`) for workspace name and initial brand hints (skippable).
3. Adjust **brand** under **Settings → Brand** (`/settings/brand`); the API persists `BrandKit` and optional logo to MinIO/S3.

The browser sends **`Authorization: Bearer`** (Clerk JWT) and **`x-forge-active-org-id`** on API calls; Postgres **RLS** enforces tenant isolation. See `docs/runbooks/TENANT_ISOLATION.md`.

### Studio (Mission 03)

1. Open **Studio** (`/studio`), enter a prompt (or use a chip), and **Generate**.
2. The API streams **SSE** events (`intent` → `html.chunk` → `html.complete`) while composing sections from the template library; the preview updates in an **iframe**.
3. **Refine** with follow-up messages, or use **Edit mode** to target a section by `data-forge-section` id. Set **`OPENAI_API_KEY`** (or other provider keys) in `.env` for live LLM calls.

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
