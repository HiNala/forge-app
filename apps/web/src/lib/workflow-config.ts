/**
 * Page-type → dashboard filters and per-workflow UI (tabs, labels, icons).
 */

import type { LucideIcon } from "lucide-react";
import { FileText, LayoutGrid, Mail, Presentation } from "lucide-react";

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

export type WorkflowSurfaceConfig = {
  chipIcon: LucideIcon;
  chipLabel: string;
  chipClassName: string;
  middleTab: { id: string; label: string; hrefSuffix: string };
  submissionsTabLabel: string;
  headerActions: "default" | "proposal" | "deck";
};

const fallback: WorkflowSurfaceConfig = {
  chipIcon: LayoutGrid,
  chipLabel: "Page",
  chipClassName: "bg-bg-elevated text-text-muted",
  middleTab: { id: "automations", label: "Automations", hrefSuffix: "/automations" },
  submissionsTabLabel: "Submissions",
  headerActions: "default",
};

export function getWorkflowSurfaceConfig(pageType: string): WorkflowSurfaceConfig {
  if (pageType === "pitch_deck") {
    return {
      chipIcon: Presentation,
      chipLabel: "Deck",
      chipClassName: "bg-violet-500/10 text-violet-800",
      middleTab: { id: "export", label: "Export", hrefSuffix: "/export" },
      submissionsTabLabel: "Viewers",
      headerActions: "deck",
    };
  }
  if (pageType === "proposal") {
    return {
      chipIcon: FileText,
      chipLabel: "Proposal",
      chipClassName: "bg-amber-500/10 text-amber-900",
      middleTab: { id: "automations", label: "Automations", hrefSuffix: "/automations" },
      submissionsTabLabel: "Viewers & decisions",
      headerActions: "proposal",
    };
  }
  if (isContactPageType(pageType)) {
    const booking = pageType.includes("booking");
    return {
      chipIcon: Mail,
      chipLabel: booking ? "Booking" : "Contact",
      chipClassName: "bg-sky-500/10 text-sky-900",
      middleTab: { id: "automations", label: "Automations", hrefSuffix: "/automations" },
      submissionsTabLabel: "Submissions",
      headerActions: "default",
    };
  }
  return fallback;
}
