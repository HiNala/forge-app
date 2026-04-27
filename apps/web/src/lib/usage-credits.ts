import { format, intervalToDuration } from "date-fns";

/** Human plan label for display (matches PRICING_MODEL tier names). */
export function displayPlanName(plan: string | undefined | null): string {
  const p = (plan ?? "free").toLowerCase();
  if (p === "max_5x") return "Max 5x";
  if (p === "max_20x" || p === "enterprise") return "Max 20x";
  if (p === "pro") return "Pro";
  if (p === "free" || p === "trial" || p === "starter") return "Free";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

/**
 * "Resets in 2 hr 17 min" — for rolling session end (5 h from window start).
 */
export function formatSessionResetsIn(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return undefined;
  const start = new Date();
  if (end.getTime() <= start.getTime()) return "Resets soon";
  const d = intervalToDuration({ start, end });
  const parts: string[] = [];
  if (d.days && d.days > 0) parts.push(`${d.days}d`);
  if (d.hours) parts.push(`${d.hours} hr`);
  if (d.minutes) parts.push(`${d.minutes} min`);
  if (parts.length === 0) parts.push("under 1 min");
  return `Resets in ${parts.join(" ")}`;
}

/**
 * "Resets Thursday 4:59 AM" — user-local clock (browser timezone).
 */
export function formatWeekResetsAt(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return undefined;
  return `Resets ${format(t, "EEEE h:mm a")}`;
}

/** Next generate/refine: rough credits (matches server `ACTION_CREDITS` until orchestration returns actuals). */
export function estimatedCreditsForAction(kind: "generate" | "refine"): number {
  return kind === "generate" ? 5 : 3;
}
