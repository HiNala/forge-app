# Google Calendar API (Python) — Reference for Forge

**Version:** google-api-python-client v2.x
**Last researched:** 2026-04-19

## What Forge Uses

Google Calendar API for: creating events when forms are submitted, syncing with user's work calendar, sending invites to submitters.

## OAuth Flow (Web App)

```python
# app/services/calendar.py
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]

def create_oauth_flow():
    return Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_OAUTH_REDIRECT_URI,
    )

def get_auth_url():
    flow = create_oauth_flow()
    url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return url, state

async def exchange_code(code: str) -> dict:
    flow = create_oauth_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials
    return {
        "access_token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_expiry": credentials.expiry.isoformat(),
        "scopes": list(credentials.scopes),
    }
```

## Creating Events

```python
async def create_event(
    access_token: str,
    refresh_token: str,
    calendar_id: str,
    summary: str,
    description: str,
    start_time: datetime,
    duration_minutes: int = 60,
    attendee_email: str | None = None,
):
    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_OAUTH_CLIENT_ID,
        client_secret=settings.GOOGLE_OAUTH_CLIENT_SECRET,
    )

    service = build("calendar", "v3", credentials=creds)

    event = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_time.isoformat(), "timeZone": "America/New_York"},
        "end": {
            "dateTime": (start_time + timedelta(minutes=duration_minutes)).isoformat(),
            "timeZone": "America/New_York",
        },
        "status": "tentative",
    }

    if attendee_email:
        event["attendees"] = [{"email": attendee_email}]

    result = service.events().insert(calendarId=calendar_id, body=event).execute()
    return result
```

## Token Refresh

```python
async def refresh_credentials(refresh_token: str) -> dict:
    """Refresh expired access token."""
    import httpx
    response = await httpx.AsyncClient().post(
        "https://oauth2.googleapis.com/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
        },
    )
    data = response.json()
    return {
        "access_token": data["access_token"],
        "expires_in": data["expires_in"],
    }
```

## Known Pitfalls

1. **Web flow, not desktop**: Use `Flow.from_client_config` with `"web"` key, not installed app flow.
2. **`access_type="offline"`**: Required to get a refresh token.
3. **`prompt="consent"`**: Forces consent screen every time. Required to get refresh token on re-auth.
4. **Token expiry**: Access tokens expire in 1 hour. Always check and refresh before use.
5. **Revoked tokens**: If user revokes access, API returns 401. Catch and prompt reconnection.
6. **Encrypt tokens**: Store access_token and refresh_token AES-encrypted in the database.

## Links
- [Calendar API Quickstart](https://developers.google.com/calendar/api/quickstart/python)
- [Events: insert](https://developers.google.com/calendar/api/v3/reference/events/insert)
