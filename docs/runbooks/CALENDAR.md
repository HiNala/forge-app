# Google Calendar OAuth

## Google Cloud Console

1. Create an OAuth **Web application** client (not desktop).
2. Authorized redirect URIs must include:
   - Production: `https://api.glidedesign.ai/api/v1/calendar/callback/google` (replace host with your API public URL)
   - Local: `http://localhost:8000/api/v1/calendar/callback/google`
3. Enable the **Google Calendar API** for the project.

## GlideDesign configuration

Set on the API:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `API_BASE_URL` — public origin of the API (used for OAuth redirect and must match the redirect URI host)
- `APP_PUBLIC_URL` — where the browser returns after OAuth (Next app)

## User flow

1. User opens **Page → Automations** (or Settings) and clicks **Connect Google Calendar**.
2. API stores short-lived OAuth state in Redis and returns Google’s authorize URL.
3. After consent, Google redirects to `/api/v1/calendar/callback/google`; tokens are encrypted with `SECRET_KEY` and stored in `calendar_connections`.
4. The user selects a connection on the automation rule when **Calendar sync** is enabled.

## Troubleshooting

- **`invalid_grant` / refresh failures**: connection is marked with `last_error`; user should reconnect.
- **Redirect mismatch**: `API_BASE_URL` and Google Console redirect URI must match exactly (scheme, host, path).
