# Zustand — Reference for Forge

**Version:** 5.0.x
**Last researched:** 2026-04-19

## What Forge Uses

Zustand for client-only UI state: sidebar collapse, Studio session state, toast queue, active tab tracking. NOT for server state (that's TanStack Query).

## Store Pattern

```typescript
// src/stores/ui.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'forge-ui',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### Studio Session Store

```typescript
// src/stores/studio.ts
import { create } from 'zustand';

interface StudioState {
  sessionId: string | null;
  activePageId: string | null;
  isGenerating: boolean;
  previewHtml: string;
  editMode: boolean;
  hoveredSection: string | null;

  setSession: (sessionId: string, pageId: string | null) => void;
  setGenerating: (generating: boolean) => void;
  setPreviewHtml: (html: string) => void;
  appendPreviewChunk: (chunk: string) => void;
  setEditMode: (mode: boolean) => void;
  setHoveredSection: (section: string | null) => void;
  resetStudio: () => void;
}

export const useStudioStore = create<StudioState>()((set) => ({
  sessionId: null,
  activePageId: null,
  isGenerating: false,
  previewHtml: '',
  editMode: false,
  hoveredSection: null,

  setSession: (sessionId, pageId) => set({ sessionId, activePageId: pageId }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setPreviewHtml: (previewHtml) => set({ previewHtml }),
  appendPreviewChunk: (chunk) =>
    set((s) => ({ previewHtml: s.previewHtml + chunk })),
  setEditMode: (editMode) => set({ editMode }),
  setHoveredSection: (hoveredSection) => set({ hoveredSection }),
  resetStudio: () =>
    set({
      sessionId: null,
      activePageId: null,
      isGenerating: false,
      previewHtml: '',
      editMode: false,
      hoveredSection: null,
    }),
}));
```

## Selecting State (Avoid Re-renders)

```tsx
'use client';
import { useUIStore } from '@/stores/ui';
import { useShallow } from 'zustand/react/shallow';

// Single property — direct selector (no useShallow needed)
function SidebarToggle() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  return <button onClick={toggle}>{collapsed ? '→' : '←'}</button>;
}

// Multiple properties — use useShallow
function StudioHeader() {
  const { isGenerating, editMode } = useStudioStore(
    useShallow((s) => ({ isGenerating: s.isGenerating, editMode: s.editMode }))
  );
  return <div>{isGenerating && <Spinner />}</div>;
}
```

## Hydration Safety in Next.js

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/ui';

function Sidebar() {
  const [hydrated, setHydrated] = useState(false);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  useEffect(() => setHydrated(true), []);

  // Show default state during SSR to avoid hydration mismatch
  const isCollapsed = hydrated ? collapsed : false;

  return <aside className={isCollapsed ? 'w-16' : 'w-64'}>...</aside>;
}
```

## Known Pitfalls

1. **Curried form for TypeScript**: Always use `create<T>()(...)` not `create<T>(...)`.
2. **No stores in Server Components**: Zustand is client-only.
3. **Hydration mismatch**: Persisted stores rehydrate on client; use `useEffect` guard for UI that depends on persisted state.
4. **Small, focused stores**: One per feature area (UI, Studio), not one giant store.

## Links
- [Zustand Docs](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Persist Middleware](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)
