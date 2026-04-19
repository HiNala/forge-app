/**
 * Single import surface for Lucide icons + Forge logo. Tree-shaking still applies per icon.
 * Prefer importing from here in app code so we can audit icon usage in one place.
 */
export type { LucideIcon } from "lucide-react";
export {
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Circle,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  Loader2,
  Menu,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";

export { ForgeLogo, ForgeMark, type ForgeLogoProps } from "./logo";
