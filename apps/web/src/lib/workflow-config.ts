/**
 * Workflow families for W-04 — dashboard, page shell, and Studio entry points.
 */

import {
  CalendarClock,
  FileSignature,
  LayoutGrid,
  Presentation,
  type LucideIcon,
} from "lucide-react";

export type WorkflowFamily = "contact" | "proposal" | "deck" | "other";

export type WorkflowFilter = "all" | WorkflowFamily;

/** Flagship Studio primers — input text only; user still submits explicitly. */
export const WORKFLOW_PRIMERS = {
  "contact-form": {
    id: "contact-form" as const,
    title: "Contact form",
    description: "Booking-ready forms that sync to your calendar.",
    prime: "A contact form for my business — ",
    icon: CalendarClock,
  },
  proposal: {
    id: "proposal" as const,
    title: "Proposal",
    description: "Professional, signable bids your clients can accept in one click.",
    prime: "A proposal for ",
    icon: FileSignature,
  },
  pitch_deck: {
    id: "pitch_deck" as const,
    title: "Pitch deck",
    description: "Investor-ready decks built from your story.",
    prime: "A pitch deck for ",
    icon: Presentation,
  },
} as const;

export type FlagshipWorkflowId = keyof typeof WORKFLOW_PRIMERS;

export function getWorkflowFamily(pageType: string): WorkflowFamily {
  const t = pageType.toLowerCase();
  if (t === "proposal") return "proposal";
  if (t === "pitch_deck") return "deck";
  if (t === "contact-form" || t === "booking-form" || t === "rsvp") return "contact";
  return "other";
}

export function workflowFilterMatchesPage(filter: WorkflowFilter, pageType: string): boolean {
  if (filter === "all") return true;
  return getWorkflowFamily(pageType) === filter;
}

const FAMILY_CHIP: Record<
  WorkflowFamily,
  { label: string; icon: LucideIcon; className: string }
> = {
  contact: {
    label: "Contact",
    icon: CalendarClock,
    className:
      "border-teal-500/35 bg-teal-500/12 text-teal-800 dark:text-teal-100",
  },
  proposal: {
    label: "Proposal",
    icon: FileSignature,
    className:
      "border-amber-500/40 bg-amber-500/12 text-amber-950 dark:text-amber-50",
  },
  deck: {
    label: "Deck",
    icon: Presentation,
    className:
      "border-indigo-500/35 bg-indigo-500/10 text-indigo-950 dark:text-indigo-50",
  },
  other: {
    label: "Page",
    icon: LayoutGrid,
    className: "border-border bg-bg-elevated text-text-muted",
  },
};

export function workflowChipProps(pageType: string): {
  label: string;
  Icon: LucideIcon;
  className: string;
} {
  const fam = getWorkflowFamily(pageType);
  const chip = FAMILY_CHIP[fam];
  const raw = pageType.replace(/-/g, " ");
  return {
    label: chip.label === "Page" ? raw : chip.label,
    Icon: chip.icon,
    className: chip.className,
  };
}

export type PageDetailWorkflowConfig = {
  submissionsTabLabel: string;
  hideAutomationsTab?: boolean;
  exportTabInsteadOfAutomations?: boolean;
  overviewAsideHint: string;
};

export function getPageDetailConfig(pageType: string): PageDetailWorkflowConfig {
  const fam = getWorkflowFamily(pageType);
  if (fam === "contact") {
    return {
      submissionsTabLabel: "Submissions",
      overviewAsideHint: "Bookings and calendar automations surface here once live.",
    };
  }
  if (fam === "proposal") {
    return {
      submissionsTabLabel: "Viewers & decisions",
      overviewAsideHint: "Track client views, decisions, and change order versions.",
    };
  }
  if (fam === "deck") {
    return {
      submissionsTabLabel: "Viewers",
      exportTabInsteadOfAutomations: true,
      hideAutomationsTab: true,
      overviewAsideHint: "Presenter sessions and exports live under Viewer and Export tabs.",
    };
  }
  return {
    submissionsTabLabel: "Submissions",
    overviewAsideHint: "Submissions and activity for this page.",
  };
}
