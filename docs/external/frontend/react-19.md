# React 19 — Reference for Forge

**Version:** 19.2.0
**Last researched:** 2026-04-19

## What Forge Uses

React 19 is the UI layer, running inside Next.js 16. Forge uses: Server Components (default in App Router), the React Compiler (auto-memoization), `useActionState` for form actions, the `use` hook for reading promises and context, `Suspense` for streaming, and `useTransition` for non-blocking UI updates.

## React Compiler (Stable)

The React Compiler is stable in React 19.2 and enabled by default in Next.js 16. It automatically memoizes components and hooks.

**What this means for Forge:**
- Do NOT wrap things in `useMemo`, `useCallback`, or `React.memo` manually
- Write plain JavaScript — the compiler optimizes it
- If you see perf issues, check the compiler output, don't add manual memoization

## Key Hooks

### `useActionState`
Replaces the common pattern of `useState` + `useEffect` + `fetch` for form submissions:

```tsx
'use client';
import { useActionState } from 'react';

async function updateBrandKit(prevState: any, formData: FormData) {
  const res = await fetch('/api/v1/org/brand', {
    method: 'PUT',
    body: JSON.stringify({
      primary_color: formData.get('primary_color'),
      secondary_color: formData.get('secondary_color'),
    }),
  });
  if (!res.ok) return { error: 'Failed to update brand kit' };
  return { success: true };
}

export function BrandKitForm() {
  const [state, formAction, isPending] = useActionState(updateBrandKit, null);

  return (
    <form action={formAction}>
      <input name="primary_color" type="color" />
      <input name="secondary_color" type="color" />
      <button disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}
```

### `use` Hook
Read promises and context directly in render. Can be called conditionally.

```tsx
'use client';
import { use, Suspense } from 'react';

function SubmissionDetail({ submissionPromise }: { submissionPromise: Promise<Submission> }) {
  const submission = use(submissionPromise);
  return <div>{submission.payload.name}</div>;
}
```

### `useTransition`
Non-blocking state updates for Studio interactions:

```tsx
'use client';
import { useTransition } from 'react';

function StudioInput() {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(prompt: string) {
    startTransition(async () => {
      await generatePage(prompt);
    });
  }

  return (
    <div>
      <input onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e.currentTarget.value)} />
      {isPending && <LoadingDots />}
    </div>
  );
}
```

## Server Components vs Client Components

| Aspect | Server Component | Client Component |
|--------|-----------------|-----------------|
| Directive | None (default) | `'use client'` at top |
| State | No `useState` | Full state access |
| Effects | No `useEffect` | Full effect access |
| Event handlers | None | Full browser events |
| Data fetching | Direct `await` | Via hooks (React Query) |
| Bundle | Zero JS shipped | Included in bundle |

**Forge pattern**: Fetch data in Server Components, pass to Client Components for interactivity:

```tsx
// Server Component (page.tsx)
export default async function PageDetail({ params }: { params: { pageId: string } }) {
  const page = await fetchPage(params.pageId);
  return <PageEditor initialPage={page} />; // Client Component
}
```

## When NOT to Use `useEffect`

React 19 + Next.js 16 make many `useEffect` patterns obsolete:
- **Data fetching** → Use Server Components or React Query
- **Form submission** → Use `useActionState`
- **Derived state** → Compute during render
- **Subscribing to external stores** → Use `useSyncExternalStore`

Only use `useEffect` for:
- Subscriptions to browser APIs (resize, intersection observer)
- SSE/WebSocket connections
- Third-party library initialization

## Known Pitfalls

1. **Don't over-use `'use client'`**: Only components that need browser APIs should be client components. Keep the boundary as far down the tree as possible.
2. **Serialization boundary**: Props passed from Server → Client must be JSON-serializable. No functions, Dates (use ISO strings), or class instances.
3. **Multiple renders in dev**: React 19 Strict Mode double-renders in development. This is normal.

## Links
- [React 19 Blog Post](https://react.dev/blog/2024/12/05/react-19)
- [useActionState](https://react.dev/reference/react/useActionState)
- [use Hook](https://react.dev/reference/react/use)
- [React Compiler](https://react.dev/learn/react-compiler)
