import { describe, expect, it } from "vitest";

import {
  buildFormFunnelSteps,
  formatAvgTimeOnPage,
  sortFieldsByDropoffSeverity,
} from "./funnel-utils";

describe("buildFormFunnelSteps", () => {
  it("maps 100 starts, 60 touches, 40 submits to bar data", () => {
    const steps = buildFormFunnelSteps({
      form_starts: 100,
      sessions_with_field_touch: 60,
      form_submits: 40,
    });
    expect(steps).toEqual([
      { step: "Form start", value: 100 },
      { step: "Field interaction", value: 60 },
      { step: "Submitted", value: 40 },
    ]);
  });
});

describe("sortFieldsByDropoffSeverity", () => {
  it("orders lowest share-of-starters first (worst drop-off)", () => {
    const sorted = sortFieldsByDropoffSeverity([
      { field: "phone", touches: 2, touch_rate_vs_starters: 0.02 },
      { field: "name", touches: 80, touch_rate_vs_starters: 0.8 },
      { field: "email", touches: 50, touch_rate_vs_starters: 0.5 },
    ]);
    expect(sorted.map((f) => f.field)).toEqual(["phone", "email", "name"]);
  });
});

describe("formatAvgTimeOnPage", () => {
  it("formats zero", () => {
    expect(formatAvgTimeOnPage(0)).toBe("0s");
  });

  it("formats short durations in seconds", () => {
    expect(formatAvgTimeOnPage(4500)).toBe("5s");
  });

  it("formats longer durations", () => {
    expect(formatAvgTimeOnPage(125000)).toBe("2m 5s");
  });
});
