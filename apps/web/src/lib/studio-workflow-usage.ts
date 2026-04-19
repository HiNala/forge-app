const KEY = "forge:studio-workflow-usage-v1";

export type WorkflowUsageId = "contact" | "proposal" | "deck";

function readCounts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function recordWorkflowPageCreated(id: WorkflowUsageId): void {
  try {
    const c = readCounts();
    c[id] = (c[id] ?? 0) + 1;
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

/** Order workflow cards with most-used first (ties keep catalog order). */
export function orderWorkflowCards<T extends { id: WorkflowUsageId }>(cards: T[]): T[] {
  const c = readCounts();
  return [...cards].sort((a, b) => (c[b.id] ?? 0) - (c[a.id] ?? 0));
}

/** Map Studio starter chip ids to the same usage buckets as `recordWorkflowPageCreated`. */
const CHIP_TO_USAGE: Partial<Record<string, WorkflowUsageId>> = {
  booking: "contact",
  contact: "contact",
  rsvp: "contact",
  proposal: "proposal",
  menu: "deck",
};

/** Sort starter chips by recorded usage (most-used first). */
export function orderStudioStarterChips<T extends { id: string }>(cards: T[]): T[] {
  const raw = readCounts();
  return [...cards].sort((a, b) => {
    const ba = CHIP_TO_USAGE[a.id];
    const bb = CHIP_TO_USAGE[b.id];
    const sa = ba ? (raw[ba] ?? 0) : 0;
    const sb = bb ? (raw[bb] ?? 0) : 0;
    return sb - sa;
  });
}

/** Which flagship workflow has the most completed Studio generations (for highlight). */
export function getTopUsedWorkflowId(): WorkflowUsageId | null {
  const c = readCounts();
  let best: WorkflowUsageId | null = null;
  let bestN = -1;
  for (const id of ["contact", "proposal", "deck"] as const) {
    const n = c[id] ?? 0;
    if (n > bestN) {
      bestN = n;
      best = id;
    }
  }
  return bestN > 0 ? best : null;
}
