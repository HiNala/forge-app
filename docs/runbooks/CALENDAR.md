# Google Calendar OAuth

## Console setup

1. In Google Cloud Console, create OAuth **Web application** credentials.
2. Authorized redirect URI (production):  
   `https://<your-api-host>/api/v1/calendar/callback/google`
3. Local development:  
   `http://localhost:8000/api/v1/calendar/callback/google`
4. Enable the **Google Calendar API** for the project.

## Environment

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `API_BASE_URL` — must match the redirect URI host the user hits during OAuth.
- `APP_PUBLIC_URL` — used for the post-OAuth redirect to the web app popup close page.

## Scopes

- `https://www.googleapis.com/auth/calendar.events` — create/update events (see `app/services/calendar.py`).

## Token storage

- Access and refresh tokens are **encrypted at rest** (`SECRET_KEY` + AES-GCM).
- **Revocation:** Deleting a connection in Forge calls Google’s revoke endpoint, then removes the row.

## Debugging

- **`invalid_grant` after refresh:** User revoked access in Google; reconnect from **Automations** or **Settings → Calendars**.
- **429 from Google:** Calendar create uses retries via the automation worker (`TransientAutomationError` → arq `Retry` with backoff).
