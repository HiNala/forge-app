# Next.js 16 App Router — Reference for Forge

**Version:** 16.2.4
**Last researched:** 2026-04-19

## What Forge Uses

Next.js 16 is the frontend framework. Forge uses the App Router with route groups `(marketing)`, `(app)`, and `(public)`, Server Components by default, Client Components for interactive surfaces (Studio, forms), streaming via Suspense, the `proxy.ts` network boundary (replaces `middleware.ts` in Next.js 16), and the Metadata API for SEO.

## Key Changes in Next.js 16

### Turbopack (Stable & Default)
All new projects use Turbopack by default. 2-5x faster production builds, up to 10x faster Fast Refresh.

### Cache Components & `use cache`
```typescript
// Data-level caching
async function getPages() {
  'use cache';
  cacheLife('hours');
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/pages`);
  return res.json();
}

// Component-level caching
export default async function DashboardPage() {
  'use cache';
  cacheTag('dashboard');
  const pages = await getPages();
  return <PageList pages={pages} />;
}
```

**Critical**: In Next.js 16, dynamic code executes at request time by default. You must explicitly opt in to caching with `'use cache'`. This replaces the implicit `fetch` caching from Next.js 14/15.

Enable in `next.config.ts`:
```typescript
const nextConfig = {
  cacheComponents: true,
};
```

### `proxy.ts` Replaces `middleware.ts`
In Next.js 16, `middleware.ts` is replaced by `proxy.ts` for clearer network boundary control:

```typescript
// proxy.ts at project root
import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /app routes
  const token = request.cookies.get('__session')?.value;
  if (pathname.startsWith('/app') && !token) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/api/:path*'],
};
```

### Routing Patterns for Forge

```
src/app/
├── (marketing)/          # Public pages - landing, pricing
│   ├── layout.tsx        # Marketing layout (no sidebar)
│   ├── page.tsx          # Landing page
│   ├── signin/page.tsx
│   └── signup/page.tsx
├── (app)/                # Authenticated app
│   ├── layout.tsx        # App layout (sidebar, nav)
│   ├── dashboard/page.tsx
│   ├── studio/page.tsx
│   ├── pages/[pageId]/
│   │   ├── page.tsx      # Page detail (overview)
│   │   ├── submissions/page.tsx
│   │   ├── automations/page.tsx
│   │   └── analytics/page.tsx
│   └── settings/
│       ├── layout.tsx    # Horizontal tab strip
│       ├── brand/page.tsx
│       └── team/page.tsx
├── (public)/             # Generated pages served publicly
│   └── p/[...slug]/page.tsx
└── api/                  # Thin proxy routes
    └── [...path]/route.ts
```

### Server vs Client Components

**Server Components (default):**
- Dashboard page (data fetching)
- Page detail overview
- Settings pages (initial load)

**Client Components (`'use client'`):**
- Studio chat interface (real-time state)
- Preview iframe controller
- Brand kit color pickers
- Submission table with inline expand
- Any component using useState, useEffect, event handlers

### Metadata API
```typescript
// app/(app)/dashboard/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Forge',
  description: 'Manage your pages, submissions, and automations',
};
```

### Streaming with Suspense
```tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<PagesSkeleton />}>
        <PagesList />
      </Suspense>
    </div>
  );
}
```

### Output Configuration for Docker
```typescript
// next.config.ts
const nextConfig = {
  output: 'standalone',
  cacheComponents: true,
};
export default nextConfig;
```

## Known Pitfalls

1. **`proxy.ts` not `middleware.ts`**: If you create a `middleware.ts`, Next.js 16 will still process it but it's deprecated. Use `proxy.ts`.
2. **Cache is opt-in**: Unlike Next.js 14 where `fetch` was cached by default, Next.js 16 is dynamic by default. Add `'use cache'` explicitly.
3. **`cacheLife` profiles**: Use named profiles (`'hours'`, `'days'`) not raw seconds.
4. **Turbopack is default in dev**: `next dev` uses Turbopack automatically. No need for `--turbo` flag.
5. **React Compiler is on**: Components are auto-memoized. Don't add manual `useMemo`/`useCallback` — let the compiler handle it.

## Links
- [Next.js 16 Docs](https://nextjs.org/docs)
- [App Router](https://nextjs.org/docs/app)
- [Cache Components](https://nextjs.org/docs/app/building-your-application/caching)
- [Deployment](https://nextjs.org/docs/app/building-your-application/deploying)
