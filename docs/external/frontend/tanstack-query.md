# TanStack Query v5 — Reference for Forge

**Version:** 5.75.x
**Last researched:** 2026-04-19

## What Forge Uses

TanStack Query (React Query) for all server state management: pages list, submissions, analytics, brand kit, team members. Zustand handles client-only state (sidebar, Studio session). Never mix the two.

## Setup with Next.js 16 App Router

### Query Client Factory

```typescript
// src/lib/get-query-client.ts
import {
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute — prevents refetch on hydration
        retry: 2,
        refetchOnWindowFocus: false,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
```

### Provider in App Layout

```tsx
// src/app/(app)/providers.tsx
'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/lib/get-query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### SSR Prefetching

```tsx
// app/(app)/dashboard/page.tsx (Server Component)
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';

export default async function DashboardPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['pages'],
    queryFn: () => fetchPages(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PagesList />
    </HydrationBoundary>
  );
}
```

## Query Patterns for Forge

### Pages List
```typescript
// src/hooks/use-pages.ts
export function usePages(status?: string) {
  return useQuery({
    queryKey: ['pages', { status }],
    queryFn: () => api.get<PageRead[]>('/api/v1/pages', { params: { status } }),
  });
}
```

### Single Page
```typescript
export function usePage(pageId: string) {
  return useQuery({
    queryKey: ['pages', pageId],
    queryFn: () => api.get<PageRead>(`/api/v1/pages/${pageId}`),
    enabled: !!pageId,
  });
}
```

### Submissions with Pagination
```typescript
export function useSubmissions(pageId: string, page = 1) {
  return useQuery({
    queryKey: ['submissions', pageId, { page }],
    queryFn: () => api.get(`/api/v1/pages/${pageId}/submissions`, {
      params: { page, per_page: 20 },
    }),
    placeholderData: keepPreviousData,
  });
}
```

## Mutation Patterns

### Publish Page
```typescript
export function usePublishPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pageId: string) =>
      api.post(`/api/v1/pages/${pageId}/publish`),
    onSuccess: (_, pageId) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['pages', pageId] });
    },
  });
}
```

### Update Brand Kit (Optimistic)
```typescript
export function useUpdateBrandKit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BrandKitWrite) => api.put('/api/v1/org/brand', data),
    onMutate: async (newBrand) => {
      await queryClient.cancelQueries({ queryKey: ['brandKit'] });
      const previous = queryClient.getQueryData(['brandKit']);
      queryClient.setQueryData(['brandKit'], (old: any) => ({ ...old, ...newBrand }));
      return { previous };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['brandKit'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['brandKit'] });
    },
  });
}
```

## Query Key Conventions

| Resource | Key Shape |
|----------|----------|
| All pages | `['pages']` |
| Pages filtered | `['pages', { status, type }]` |
| Single page | `['pages', pageId]` |
| Submissions | `['submissions', pageId, { page }]` |
| Single submission | `['submissions', submissionId]` |
| Analytics | `['analytics', pageId, { range }]` |
| Brand kit | `['brandKit']` |
| Team members | `['team']` |
| Current user | `['auth', 'me']` |

## Known Pitfalls

1. **`staleTime` must be > 0**: If 0 (default), data refetches immediately on hydration, defeating SSR.
2. **Mutations don't hydrate**: They're client-only. Always use `invalidateQueries` in `onSuccess`.
3. **Request-scoped on server**: Never share a QueryClient across requests. The factory pattern above handles this.
4. **Data must be serializable**: Objects passed via HydrationBoundary must be JSON-serializable.

## Links
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [SSR & Next.js](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)
- [Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
