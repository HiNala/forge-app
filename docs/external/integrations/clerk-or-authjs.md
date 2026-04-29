# Superseded: Clerk vs Auth.js — Reference for Forge

This ADR is superseded as of 2026-04-28. GlideDesign now uses first-party database-backed auth with password login, Google OAuth, internal JWTs, and Postgres refresh-session state. See [`docs/guides/CUSTOM_AUTH_SETUP.md`](../../guides/CUSTOM_AUTH_SETUP.md).

**Version:** `@clerk/nextjs` 7.2.3 (npm latest stable at research; pin in `apps/web/package.json` when Clerk is added)
**Last researched:** 2026-04-18

## Decision (ADR-002)

Forge uses **Clerk** (`@clerk/nextjs`) for authentication and **Organizations** for multi-tenant membership. **Auth.js v5** was evaluated and rejected for v1 launch velocity reasons (see below).

## Why Not Auth.js v5?

| Factor | Clerk | Auth.js v5 |
|--------|--------|------------|
| Organizations / RBAC | First-class Organizations product | Build custom tables + session claims |
| Prebuilt UI | Sign-in/up components | More DIY |
| Webhooks | Svix-backed delivery | You wire providers yourself |
| Our timeline | Days to integrate | Weeks for org switcher + invites + RBAC parity |

Auth.js remains viable if we ever need to minimize vendor cost at very large MAU; revisit via ADR if requirements change.

## What Forge Uses

Clerk for authentication per ADR-002. Handles: email + password signup, Google SSO, organization management, JWT issuance, webhook lifecycle events.

## Frontend Setup

```bash
pnpm add @clerk/nextjs@7.2.3
```

```typescript
// src/app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html><body>{children}</body></html>
    </ClerkProvider>
  );
}
```

```typescript
// proxy.ts (Next.js 16 request layer; see nextjs-16-app-router.md)
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher(['/app(.*)', '/api/v1(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = { matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'] };
```

## Backend JWT Verification (FastAPI)

```python
# app/middleware/auth.py
from jose import jwt, JWTError
import httpx

CLERK_JWKS_URL = "https://<your-clerk-domain>/.well-known/jwks.json"
_jwks_cache = None

async def get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(CLERK_JWKS_URL)
            _jwks_cache = resp.json()
    return _jwks_cache

async def verify_clerk_token(token: str) -> dict:
    jwks = await get_jwks()
    header = jwt.get_unverified_header(token)
    key = next(k for k in jwks["keys"] if k["kid"] == header["kid"])

    payload = jwt.decode(
        token,
        key,
        algorithms=["RS256"],
        audience=None,  # Set to your Clerk frontend API URL
    )
    return payload  # Contains sub (user_id), org_id, etc.
```

## Webhook Handling

```python
# app/api/v1/auth.py
from svix.webhooks import Webhook

@router.post("/auth/webhook")
async def clerk_webhook(request: Request, db: DbSession):
    payload = await request.body()
    headers = dict(request.headers)

    # Verify webhook signature
    wh = Webhook(settings.CLERK_WEBHOOK_SECRET)
    try:
        data = wh.verify(payload, headers)
    except Exception:
        raise HTTPException(401, "Invalid webhook signature")

    event_type = data.get("type")
    match event_type:
        case "user.created":
            # Create User row + default Organization + Owner Membership
            pass
        case "user.updated":
            # Sync display_name, avatar_url
            pass
        case "user.deleted":
            # Mark user as deleted, cascade
            pass
```

## Key Hooks

```typescript
'use client';
import { useUser, useOrganization, useOrganizationList } from '@clerk/nextjs';

function useSession() {
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, membership } = useOrganization();
  const { setActive } = useOrganizationList();

  return {
    user,
    activeOrg: organization,
    role: membership?.role,
    switchOrg: (orgId: string) => setActive?.({ organization: orgId }),
    isLoading: !userLoaded,
  };
}
```

## Known Pitfalls

1. **Sync user to DB**: Clerk is the auth provider, but our DB is the source of truth for business logic. Always sync via webhook.
2. **JWKS caching**: Cache the JWKS response. Don't fetch on every request.
3. **Webhook verification**: Use the Svix SDK for signature verification. Don't skip this.
4. **Organization support**: Enable Organizations in the Clerk dashboard for Forge’s tenant model.

## Links

- [Clerk Next.js Docs](https://clerk.com/docs/quickstarts/nextjs)
- [Backend JWT Verification](https://clerk.com/docs/backend-requests/handling/manual-jwt)
- [Webhooks](https://clerk.com/docs/integrations/webhooks)
- [Auth.js](https://authjs.dev/) (not selected for v1 — reference only)
