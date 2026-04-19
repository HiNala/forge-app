# Framer Motion — Reference for Forge

**Version:** 12.x
**Last researched:** 2026-04-19

## What Forge Uses

Framer Motion for micro-interactions: sidebar collapse animation, section-edit crossfade, card lifts, screen fade-ins, button press animations, toast enter/exit, confetti on first publish.

## Core Patterns

### AnimatePresence (Enter/Exit)
```tsx
import { AnimatePresence, motion } from 'framer-motion';

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <AnimatePresence>
      {toasts.map((toast) => (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {toast.message}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
```

### Section Edit Crossfade (The Key Animation)
```tsx
function PreviewSection({ html, sectionId }: { html: string; sectionId: string }) {
  return (
    <motion.div
      key={`${sectionId}-${html.length}`} // Force re-render on content change
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

### Sidebar Collapse
```tsx
function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        mass: 0.8,
      }}
      className="overflow-hidden"
    >
      {/* content */}
    </motion.aside>
  );
}
```

### Card Lift on Hover
```tsx
<motion.div
  whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
  className="card"
>
  {/* card content */}
</motion.div>
```

### Page/Screen Fade-In
```tsx
// Wrap page content
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {children}
</motion.div>
```

### Layout Animations
```tsx
// Submission row expand/collapse
<motion.div layout transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
  <SubmissionRow />
  <AnimatePresence>
    {expanded && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
      >
        <SubmissionDetail />
      </motion.div>
    )}
  </AnimatePresence>
</motion.div>
```

## Spring Physics Defaults for Forge

```typescript
export const SPRING_SNAPPY = { type: 'spring', stiffness: 400, damping: 30 } as const;
export const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 25 } as const;
export const SPRING_BOUNCY = { type: 'spring', stiffness: 300, damping: 15 } as const;
```

## Known Pitfalls

1. **`layout` prop**: Can cause layout thrashing if used on large subtrees. Use sparingly.
2. **`AnimatePresence` needs `key`**: Every direct child must have a unique `key`.
3. **Server Components**: Framer Motion is client-only. Always use `'use client'`.
4. **Bundle size**: Import only what you need: `import { motion, AnimatePresence } from 'framer-motion'`.

## Links
- [Framer Motion Docs](https://www.framer.com/motion/)
- [AnimatePresence](https://www.framer.com/motion/animate-presence/)
