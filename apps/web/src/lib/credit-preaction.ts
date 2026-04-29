/**
 * BP-04 — Decide when to show cost confirmation before Studio runs.
 */

export type CreditConfirmPrefsLike = {
  credit_confirm_threshold_cents: number;
  credit_confirm_skip_under_credits: number;
};

/**
 * Confirmation when the estimate clears either:
 * - dynamic bar: ≤5% of session cap OR pref threshold USD (default $0.50), whichever is lower, expressed in credits-ish terms using cost hint cents; OR
 * - ≥5% of session cap in credits alone (when cap is meaningful).
 *
 * Prefer server `estimated_cost_cents_hint` vs session ratio when comparing to dollar thresholds.
 */
export function shouldShowCreditConfirm(opts: {
  estimatedCredits: number;
  estimatedCostCentsHint: number | null | undefined;
  sessionCapCredits: number;
  sessionUsedCredits: number;
  prefs: CreditConfirmPrefsLike;
  /** When true (low remaining session credits), widen guardrails slightly. */
  squeezeSession: boolean;
}): boolean {
  const { estimatedCredits, estimatedCostCentsHint, sessionCapCredits, sessionUsedCredits, prefs, squeezeSession } =
    opts;
  if (estimatedCredits <= 0 && (estimatedCostCentsHint ?? 0) <= 0) return false;
  if (estimatedCredits < prefs.credit_confirm_skip_under_credits) return false;

  const cap = Math.max(0, sessionCapCredits);
  const fivePctCredits = Math.max(1, Math.floor(cap * 0.05));

  /** Dollar-derived soft bar (tier hint already applied server-side per org). */
  const thresholdCents = Math.min(Math.max(10, prefs.credit_confirm_threshold_cents), 500);
  const hint = estimatedCostCentsHint ?? 0;
  if (hint > 0 && hint >= thresholdCents) return true;

  if (estimatedCredits >= fivePctCredits) {
    return true;
  }

  if (
    squeezeSession &&
    cap > 0 &&
    sessionUsedCredits / cap >= 0.7 &&
    estimatedCredits >= Math.max(1, Math.floor(fivePctCredits * 0.5))
  ) {
    return true;
  }

  return false;
}
