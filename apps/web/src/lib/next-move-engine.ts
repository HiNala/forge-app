/** BP-03 — client-side Next Move heuristics (server engine can supersede via API later). */

import type { GlideDesignFourLayerPayload } from "@/lib/forge-four-layer";

export type NextMoveKind =
  | "refine"
  | "add_screen"
  | "simulate"
  | "deploy"
  | "test"
  | "improve_onboarding"
  | "add_loop"
  | "pricing"
  | "analytics_check"
  | "memory_edit";

export type NextMove = {
  id: string;
  title: string;
  rationale: string;
  action_kind: NextMoveKind;
  action_payload: Record<string, unknown>;
  confidence: number;
  priority: number;
};

export type NextMoveInput = {
  pageTitle: string;
  pageType: string;
  status: string;
  qualityScore?: number | null;
  lastReviewDegraded?: boolean | null;
  fourLayer?: GlideDesignFourLayerPayload | null;
  /** True when intent JSON has no meaningful flow / multi-step description */
  flowLooksEmpty?: boolean;
  /** Analytics unique visitors (GL-01) when known */
  visitorCount?: number | null;
  /** Whether monetization block exists in strategy/system */
  hasMonetizationHint?: boolean;
};

const DISMISS_KEY = "forge:next-move-dismissed";

export function loadNextMoveDismissals(): Record<string, { count: number; until?: number; permanent?: boolean }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(DISMISS_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, { count: number; until?: number; permanent?: boolean }>;
    return typeof o === "object" && o ? o : {};
  } catch {
    return {};
  }
}

export function persistNextMoveDismissals(m: Record<string, { count: number; until?: number; permanent?: boolean }>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

export function computeNextMoves(input: NextMoveInput): NextMove[] {
  const out: NextMove[] = [];

  if (input.flowLooksEmpty) {
    out.push({
      id: "sketch-first-minutes",
      title: "Sketch the user's first three minutes in the product",
      rationale: "A clear flow helps GlideDesign align screens, system rules, and metrics.",
      action_kind: "add_screen",
      action_payload: { stage: "idea" },
      confidence: 0.72,
      priority: 90,
    });
  }

  const q = input.qualityScore;
  if (typeof q === "number" && q < 70) {
    out.push({
      id: "quality-accessibility",
      title: "GlideDesign noticed quality gaps — tighten layout and accessibility in one pass",
      rationale: "Low review scores usually improve fastest with a targeted refine.",
      action_kind: "refine",
      action_payload: { focus: "accessibility" },
      confidence: 0.65,
      priority: 78,
    });
  }

  if (input.status === "live" && (input.visitorCount ?? 0) < 5) {
    out.push({
      id: "share-first-link",
      title: "Share your first link to gather signal",
      rationale: "Published projects learn faster with a handful of real visitors.",
      action_kind: "deploy",
      action_payload: { open: "share" },
      confidence: 0.7,
      priority: 60,
    });
  }

  if (!input.hasMonetizationHint) {
    out.push({
      id: "add-monetization",
      title: "Add a way to charge for this when you are ready",
      rationale: "Capturing pricing early keeps system design and canvas aligned.",
      action_kind: "pricing",
      action_payload: { stage: "system", tab: "money" },
      confidence: 0.55,
      priority: 40,
    });
  }

  out.sort((a, b) => b.priority - a.priority);
  return out;
}

export function pickNextMove(moves: NextMove[]): NextMove | null {
  return moves[0] ?? null;
}
