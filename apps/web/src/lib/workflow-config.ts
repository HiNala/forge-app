/**
 * Page-type → dashboard filters and per-workflow UI (tabs, labels, icons).
 */

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Camera,
  FileText,
  Globe,
  HelpCircle,
  LayoutGrid,
  Link2,
  Mail,
  Presentation,
  Rocket,
  Timer,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";

export type DashboardWorkflowFilter = "all" | "contact" | "proposal" | "deck" | "other";

function isContactPageType(pageType: string): boolean {
  if (pageType === "booking-form" || pageType === "contact-form") return true;
  if (pageType === "rsvp" || pageType === "landing") return true;
  if (pageType.includes("contact") || pageType.includes("booking")) return true;
  return false;
}

/** High-level workflow bucket for analytics and grouping. */
export type WorkflowFamily = "contact" | "proposal" | "deck" | "other";

export function getWorkflowFamily(pageType: string): WorkflowFamily {
  if (pageType === "pitch_deck") return "deck";
  if (pageType === "proposal") return "proposal";
  if (isContactPageType(pageType)) return "contact";
  return "other";
}

export function pageMatchesWorkflowFilter(
  pageType: string,
  filter: DashboardWorkflowFilter,
): boolean {
  if (filter === "all") return true;
  const contact = isContactPageType(pageType);
  const proposal = pageType === "proposal";
  const deck = pageType === "pitch_deck";
  if (filter === "contact") return contact;
  if (filter === "proposal") return proposal;
  if (filter === "deck") return deck;
  if (filter === "other") return !contact && !proposal && !deck;
  return true;
}

/** Maps Studio empty-state row labels to ``pages.page_type`` values used in template seeds. */
const TEMPLATE_GALLERY_ROW_PAGE_TYPES: Record<string, readonly string[]> = {
  "Pages & sites": ["landing", "coming_soon", "waitlist"],
  "Forms & gathering": ["contact-form", "booking-form", "survey", "quiz", "rsvp"],
  "Sales & business": ["proposal", "pitch_deck", "menu", "gallery"],
  "Personal & social": ["link_in_bio", "resume", "portfolio"],
};

export function templateMatchesStudioRow(
  pageType: string | null | undefined,
  rowCategory: string,
): boolean {
  if (!pageType) return false;
  const allowed = TEMPLATE_GALLERY_ROW_PAGE_TYPES[rowCategory];
  return allowed ? allowed.includes(pageType) : false;
}

export type WorkflowSurfaceConfig = {
  chipIcon: LucideIcon;
  chipLabel: string;
  chipClassName: string;
  /** Third tab — flows, webhooks, and inbox routing (path `/automations`). */
  automationsTabLabel: string;
  submissionsTabLabel: string;
  headerActions: "default" | "proposal" | "deck";
};

const fallback: WorkflowSurfaceConfig = {
  chipIcon: LayoutGrid,
  chipLabel: "Page",
  chipClassName: "bg-bg-elevated text-text-muted",
  automationsTabLabel: "Automations",
  submissionsTabLabel: "Submissions",
  headerActions: "default",
};

export function getWorkflowSurfaceConfig(pageType: string): WorkflowSurfaceConfig {
  if (pageType === "pitch_deck") {
    return {
      chipIcon: Presentation,
      chipLabel: "Deck",
      chipClassName: "bg-violet-500/10 text-violet-800",
      automationsTabLabel: "Automations",
      submissionsTabLabel: "Viewers",
      headerActions: "deck",
    };
  }
  if (pageType === "proposal") {
    return {
      chipIcon: FileText,
      chipLabel: "Proposal",
      chipClassName: "bg-amber-500/10 text-amber-900",
      automationsTabLabel: "Automations",
      submissionsTabLabel: "Viewers & decisions",
      headerActions: "proposal",
    };
  }
  if (pageType === "portfolio") {
    return {
      chipIcon: Globe,
      chipLabel: "Portfolio",
      chipClassName: "bg-emerald-500/10 text-emerald-800",
      automationsTabLabel: "Automations",
      submissionsTabLabel: "Inquiries",
      headerActions: "default",
    };
  }
  if (pageType === "link_in_bio") {
    return {
      chipIcon: Link2,
      chipLabel: "Link in bio",
      chipClassName: "bg-pink-500/10 text-pink-800",
      automationsTabLabel: "Links",
      submissionsTabLabel: "Submissions",
      headerActions: "default",
    };
  }
  if (pageType === "waitlist") {
    return {
      chipIcon: Rocket,
      chipLabel: "Waitlist",
      chipClassName: "bg-orange-500/10 text-orange-800",
      automationsTabLabel: "Automations",
      submissionsTabLabel: "Sign-ups",
      headerActions: "default",
    };
  }
  if (pageType === "coming_soon") {
    return {
      chipIcon: Timer,
      chipLabel: "Coming soon",
      chipClassName: "bg-amber-500/10 text-amber-900",
      automationsTabLabel: "Waitlist",
      submissionsTabLabel: "Sign-ups",
      headerActions: "default",
    };
  }
  if (pageType === "survey") {
    return {
      chipIcon: BarChart3,
      chipLabel: "Survey",
      chipClassName: "bg-indigo-500/10 text-indigo-900",
      automationsTabLabel: "Logic & routing",
      submissionsTabLabel: "Responses",
      headerActions: "default",
    };
  }
  if (pageType === "quiz") {
    return {
      chipIcon: HelpCircle,
      chipLabel: "Quiz",
      chipClassName: "bg-fuchsia-500/10 text-fuchsia-900",
      automationsTabLabel: "Scoring & routing",
      submissionsTabLabel: "Completions",
      headerActions: "default",
    };
  }
  if (pageType === "resume") {
    return {
      chipIcon: UserRound,
      chipLabel: "Resume",
      chipClassName: "bg-slate-500/10 text-slate-900",
      automationsTabLabel: "Sections",
      submissionsTabLabel: "Viewers",
      headerActions: "default",
    };
  }
  if (pageType === "gallery") {
    return {
      chipIcon: Camera,
      chipLabel: "Gallery",
      chipClassName: "bg-teal-500/10 text-teal-900",
      automationsTabLabel: "Images & CTAs",
      submissionsTabLabel: "Inquiries",
      headerActions: "default",
    };
  }
  if (pageType === "menu") {
    return {
      chipIcon: UtensilsCrossed,
      chipLabel: "Menu",
      chipClassName: "bg-lime-500/10 text-lime-900",
      automationsTabLabel: "Menu items",
      submissionsTabLabel: "Inquiries",
      headerActions: "default",
    };
  }
  if (isContactPageType(pageType)) {
    const booking = pageType.includes("booking");
    return {
      chipIcon: Mail,
      chipLabel: booking ? "Booking" : "Contact",
      chipClassName: "bg-sky-500/10 text-sky-900",
      automationsTabLabel: "Automations",
      submissionsTabLabel: "Submissions",
      headerActions: "default",
    };
  }
  return fallback;
}
