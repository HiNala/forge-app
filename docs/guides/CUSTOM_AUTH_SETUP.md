# Custom Auth Setup

GlideDesign now uses first-party database-backed auth. The API owns users, password hashes, OAuth identities, short-lived access JWTs, and rotating refresh sessions.

## Environment

API:

```bash
AUTH_JWT_SECRET=<openssl rand -hex 32>
AUTH_JWT_ISSUER=glidedesign-api
AUTH_JWT_AUDIENCE=glidedesign-web
AUTH_ACCESS_TOKEN_TTL_SECONDS=900
AUTH_REFRESH_TOKEN_TTL_SECONDS=2592000
AUTH_PASSWORD_MIN_LENGTH=12
```

Google login OAuth:

```bash
GOOGLE_AUTH_CLIENT_ID=<google OAuth web client id>
GOOGLE_AUTH_CLIENT_SECRET=<google OAuth web client secret>
```

If `GOOGLE_AUTH_*` is empty, the API falls back to the existing `GOOGLE_OAUTH_*` values used by Calendar. Calendar OAuth and login OAuth must have separate redirect URIs:

- Login: `http://localhost:8000/api/v1/auth/oauth/google/callback`
- Calendar: `http://localhost:8000/api/v1/calendar/callback/google`

Production values must use HTTPS and match `API_BASE_URL`.

## Database

Run migrations:

```bash
cd apps/api
alembic upgrade head
```

The auth migration adds:

- `users.password_hash`
- `oauth_identities` for Google account links
- `auth_sessions` for hashed refresh tokens and revocation state

## Seed Users

Create manual-test users:

```bash
cd apps/api
uv run python scripts/seed_auth_test_users.py
```

Local credentials:

- `admin@glidedesign.local` / `GlideDesignDev!2026` with platform admin enabled
- `free@glidedesign.local` / `GlideDesignDev!2026` on the Free tier

Do not reuse the seed password outside local/dev.

## Google Cloud

1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Create or select the GlideDesign project.
3. Configure OAuth consent screen with app name, privacy policy, and support email.
4. Create a Web application OAuth client.
5. Add redirect URIs for local, staging, and production:
   - `http://localhost:8000/api/v1/auth/oauth/google/callback`
   - `https://<api-domain>/api/v1/auth/oauth/google/callback`
6. Use only `openid email profile` for login.

## Security Checklist

- Use a dedicated high-entropy `AUTH_JWT_SECRET` in each environment.
- Keep access tokens short-lived and refresh tokens rotating.
- Store only bcrypt hashes for passwords and SHA-256 hashes for refresh tokens.
- Keep `AUTH_TEST_BYPASS=false` in production.
- Set explicit `TRUSTED_HOSTS` and HTTPS public URLs in production.
- Rotate `AUTH_JWT_SECRET` by forcing all users to sign in again.
- Review `/health/deep` for the `auth` check before launch.

## Verification

```bash
cd apps/api
python scripts/export_openapi.py openapi.json
pytest tests/test_custom_auth.py
```

```bash
cd apps/web
pnpm codegen:api
pnpm typecheck
```

Manual checks:

1. Visit `/signup`, create an email/password account, and land in onboarding.
2. Visit `/signin`, sign in as `admin@glidedesign.local`, and confirm admin pages work.
3. Sign in as `free@glidedesign.local`, confirm Free-tier billing limits display.
4. Click “Continue with Google” and verify the OAuth callback redirects to the app.
5. Sign out and confirm the protected app shell redirects to `/signin`.
