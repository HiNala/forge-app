# Google OAuth Setup — Reference for Forge

**Version:** OAuth 2.0
**Last researched:** 2026-04-19

## Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project "Forge"
3. Enable "Google Calendar API"
4. Configure OAuth consent screen:
   - User type: External
   - App name: Forge
   - Scopes: `calendar.events`
   - Test users: add your email for dev
5. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/calendar/callback` (dev), `https://forge.app/api/auth/calendar/callback` (prod)
6. Copy Client ID and Client Secret to `.env`

## Scope

- `https://www.googleapis.com/auth/calendar.events` — Read/write events on all calendars
- We do NOT request `calendar` (full read/write on all calendar settings)

## Production Verification

For >100 users, submit for verification:
- Need privacy policy URL
- Need terms of service URL
- Need homepage URL
- Review takes 2-6 weeks

## Known Pitfalls

1. **Test mode limits**: Max 100 test users before verification.
2. **Refresh token only on first consent**: Unless you use `prompt="consent"`.
3. **Redirect URI mismatch**: Must exactly match what's in the console.

## Links
- [OAuth 2.0 for Web](https://developers.google.com/identity/protocols/oauth2/web-server)
