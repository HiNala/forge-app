import { describe, expect, it } from "vitest";
import { WORKFLOW_SLUGS, getWorkflowLanding } from "./workflow-landings";

describe("workflow-landings", () => {
  it("exposes canonical workflow slug list (marketing /compare)", () => {
    expect(WORKFLOW_SLUGS).toHaveLength(15);
  });

  it("resolves each slug", () => {
    for (const s of WORKFLOW_SLUGS) {
      expect(getWorkflowLanding(s)).not.toBeNull();
    }
    expect(getWorkflowLanding("nope")).toBeNull();
  });
});
