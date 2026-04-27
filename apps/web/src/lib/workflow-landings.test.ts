import { describe, expect, it } from "vitest";
import { WORKFLOW_SLUGS, getWorkflowLanding } from "./workflow-landings";

describe("workflow-landings", () => {
  it("exposes six workflow slugs for V2-P01", () => {
    expect(WORKFLOW_SLUGS).toHaveLength(6);
  });

  it("resolves each slug", () => {
    for (const s of WORKFLOW_SLUGS) {
      expect(getWorkflowLanding(s)).not.toBeNull();
    }
    expect(getWorkflowLanding("nope")).toBeNull();
  });
});
