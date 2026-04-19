# shadcn/ui — Reference for Forge

**Version:** Latest (component library, not versioned as a package)
**Last researched:** 2026-04-19

## What Forge Uses

shadcn/ui as the base component primitives. Components are copied into the project (not installed as a dependency) and re-themed to match Forge's design system. We use: Button, Input, Textarea, Dialog, Sheet, Tabs, Toast, DropdownMenu, Avatar, Badge, Card, Table, Skeleton, Tooltip, Popover, Command.

## Install Flow

```bash
pnpm dlx shadcn@latest init
# Select: New York style, CSS variables, tailwind.config.ts
```

Then install individual components:
```bash
pnpm dlx shadcn@latest add button input textarea dialog sheet tabs \
  toast dropdown-menu avatar badge card table skeleton tooltip popover command
```

Components land in `src/components/ui/`.

## Re-theming for Forge

shadcn/ui uses CSS variables. Override in `globals.css`:

```css
@layer base {
  :root {
    --background: 40 30% 97%;        /* warm cream */
    --foreground: 220 15% 15%;       /* near-black */
    --primary: 192 100% 35%;         /* brand teal */
    --primary-foreground: 0 0% 100%;
    --secondary: 220 10% 90%;
    --accent: 30 100% 55%;           /* warm accent */
    --muted: 220 10% 95%;
    --border: 220 10% 88%;
    --ring: 192 100% 35%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 220 20% 10%;
    --foreground: 220 10% 90%;
    --primary: 192 80% 50%;
    --border: 220 15% 20%;
  }
}
```

## Component Usage Examples

### Button Variants
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default">Publish</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost" size="icon"><X className="h-4 w-4" /></Button>
<Button variant="destructive">Delete Page</Button>
```

### Dialog (for confirmations)
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

<Dialog open={showPublish} onOpenChange={setShowPublish}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Publish this page?</DialogTitle>
    </DialogHeader>
    <p>Your page will be live at forge.app/{slug}</p>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowPublish(false)}>Cancel</Button>
      <Button onClick={handlePublish}>Publish</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Tabs (for Settings, Page Detail)
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="submissions">Submissions (3)</TabsTrigger>
    <TabsTrigger value="automations">Automations</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
  </TabsList>
  <TabsContent value="overview"><OverviewTab /></TabsContent>
  <TabsContent value="submissions"><SubmissionsTab /></TabsContent>
</Tabs>
```

### Toast (via sonner)
```tsx
import { toast } from 'sonner';

// Success
toast.success('Page published!', { description: 'https://reds.forge.app/small-jobs' });

// Error
toast.error('Failed to save', { description: 'Please try again' });
```

## Known Pitfalls

1. **Not a package**: shadcn/ui components are copied into your project. You own them. Edit freely.
2. **CSS variables**: All theming is via CSS variables, not Tailwind config colors.
3. **`cn()` utility**: shadcn uses `clsx` + `tailwind-merge` via a `cn()` helper. Keep using it.
4. **Radix primitives**: Components are built on Radix UI. Event handling follows Radix patterns.

## Links
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Component Reference](https://ui.shadcn.com/docs/components)
