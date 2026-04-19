# Tailwind CSS — Reference for Forge

**Version:** 4.1 (compatible with Next.js 16)
**Last researched:** 2026-04-19

## What Forge Uses

Tailwind CSS for all styling. Component library (shadcn/ui) sits on top. Custom design tokens loaded from the designer's palette. Dark mode via `class` strategy for Studio split-screen.

## Setup with Next.js 16

Tailwind v4 uses CSS-first configuration. No `tailwind.config.ts` needed for basic setup.

```css
/* src/app/globals.css */
@import "tailwindcss";

/* Custom design tokens */
@theme {
  --color-brand-primary: oklch(50% 0.15 192);
  --color-brand-secondary: oklch(25% 0.05 192);
  --color-brand-accent: oklch(65% 0.2 30);

  --color-surface: oklch(98% 0.005 90);
  --color-surface-dark: oklch(15% 0.01 250);

  --font-display: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}
```

## Dark Mode (Studio Panel)

Studio split-screen uses a dark chat panel. Apply `.dark` class to the Studio container:

```tsx
<div className="flex h-screen">
  <div className="dark w-1/2 bg-surface-dark text-white">
    {/* Chat panel */}
  </div>
  <div className="w-1/2 bg-surface">
    {/* Preview pane */}
  </div>
</div>
```

## Component Layer with `@apply`

Use `@apply` sparingly in the component layer for repeated patterns:

```css
/* src/app/globals.css */
@layer components {
  .btn-primary {
    @apply bg-brand-primary text-white px-4 py-2 rounded-md font-medium
           hover:brightness-110 active:brightness-90 transition-all;
  }

  .card {
    @apply bg-white rounded-lg border border-gray-200 shadow-sm p-6;
  }

  .input-field {
    @apply w-full rounded-md border border-gray-300 px-3 py-2
           focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20
           outline-none transition-all;
  }
}
```

## Responsive Design

Generated pages must be mobile-first. Standard breakpoints:

```html
<div class="px-4 md:px-8 lg:px-16">
  <h1 class="text-2xl md:text-4xl lg:text-5xl">...</h1>
</div>
```

## Custom Palette from BrandKit

When the user's BrandKit colors are loaded, inject them as CSS custom properties:

```tsx
// In the app layout, apply brand colors dynamically
<div
  style={{
    '--color-brand-primary': brandKit.primaryColor,
    '--color-brand-secondary': brandKit.secondaryColor,
  } as React.CSSProperties}
>
  {children}
</div>
```

## Known Pitfalls

1. **Tailwind v4 uses CSS-based config**: Don't create `tailwind.config.ts` unless you need advanced features.
2. **`@theme` directive**: New in v4 — this is where design tokens live.
3. **`@apply` in components**: Still works but prefer utility classes directly in JSX.
4. **Dynamic classes**: Don't construct class names dynamically (`bg-${color}-500`). Use style prop or CSS variables instead.

## Links
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [Using with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
