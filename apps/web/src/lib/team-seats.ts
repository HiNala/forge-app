/** Mirrors `team_seat_limit` in `apps/api/app/services/billing_plans.py`. */
export function teamSeatLimit(plan: string, trialEndsAt: string | null): number {
  const trialActive = trialEndsAt != null && new Date(trialEndsAt) > new Date();
  const p = plan === "enterprise" ? "enterprise" : trialActive ? "pro" : plan;
  if (p === "enterprise") return 1000;
  if (p === "pro") return 10;
  if (p === "starter") return 1;
  return 3;
}
