# Lucide React — Reference for Forge

**Version:** 0.470.x
**Last researched:** 2026-04-19

## What Forge Uses

Lucide React for all iconography across the Forge UI. Tree-shakable, consistent 24x24 stroke icons.

## Usage

```tsx
import { Home, FileText, Settings, Plus, ChevronLeft, Eye, Pencil } from 'lucide-react';

<Home className="h-5 w-5" />
<FileText className="h-4 w-4 text-muted-foreground" />
<Plus className="h-4 w-4" strokeWidth={2.5} />
```

## Icon Mapping for Forge UI

| UI Element | Icon |
|-----------|------|
| Dashboard | `LayoutDashboard` |
| Studio | `Wand2` or `Sparkles` |
| Pages | `FileText` |
| Submissions | `Inbox` |
| Automations | `Zap` |
| Analytics | `BarChart3` |
| Settings | `Settings` |
| Brand Kit | `Palette` |
| Team | `Users` |
| Publish | `Globe` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| Add | `Plus` |
| Close | `X` |
| Menu | `Menu` |
| Collapse sidebar | `PanelLeftClose` |
| Expand sidebar | `PanelLeft` |
| External link | `ExternalLink` |
| Copy | `Copy` |
| Check | `Check` |
| Calendar | `Calendar` |
| Email | `Mail` |
| Upload | `Upload` |
| Download | `Download` |
| Search | `Search` |
| Filter | `SlidersHorizontal` |

## Known Pitfalls

1. **Tree-shaking**: Import individual icons, not `import * as Icons from 'lucide-react'`.
2. **Size consistency**: Use `h-4 w-4` for inline, `h-5 w-5` for nav, `h-6 w-6` for hero.
3. **Stroke width**: Default is 2. Use 1.5 for lighter feel, 2.5 for bolder emphasis.

## Links
- [Lucide Icons](https://lucide.dev/icons/)
- [Lucide React](https://lucide.dev/guide/packages/lucide-react)
