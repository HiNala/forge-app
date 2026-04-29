import { describe, expect, it } from "vitest";
import { shouldShowCreditConfirm } from "./credit-preaction";

const basePrefs = {
  credit_confirm_threshold_cents: 50,
  credit_confirm_skip_under_credits: 75,
};

describe("shouldShowCreditConfirm", () => {
  it("returns false below skip-under credits", () => {
    expect(
      shouldShowCreditConfirm({
        estimatedCredits: 70,
        estimatedCostCentsHint: 0,
        sessionCapCredits: 200,
        sessionUsedCredits: 0,
        prefs: basePrefs,
        squeezeSession: false,
      }),
    ).toBe(false);
  });

  it("shows when credits exceed five percent of session cap", () => {
    expect(
      shouldShowCreditConfirm({
        estimatedCredits: 80,
        estimatedCostCentsHint: 20,
        sessionCapCredits: 200,
        sessionUsedCredits: 0,
        prefs: basePrefs,
        squeezeSession: false,
      }),
    ).toBe(true);
  });

  it("shows when dollar hint clears threshold cents", () => {
    expect(
      shouldShowCreditConfirm({
        estimatedCredits: 80,
        estimatedCostCentsHint: 60,
        sessionCapCredits: 500,
        sessionUsedCredits: 0,
        prefs: basePrefs,
        squeezeSession: false,
      }),
    ).toBe(true);
  });
});
