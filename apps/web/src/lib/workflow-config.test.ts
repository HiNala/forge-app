import { describe, expect, it } from "vitest";
import { getWorkflowFamily, pageMatchesWorkflowFilter } from "./workflow-config";

describe("workflow-config", () => {
  it("classifies page types into families", () => {
    expect(getWorkflowFamily("contact-form")).toBe("contact");
    expect(getWorkflowFamily("proposal")).toBe("proposal");
    expect(getWorkflowFamily("pitch_deck")).toBe("deck");
    expect(getWorkflowFamily("landing")).toBe("contact");
  });

  it("filters dashboard rows by workflow", () => {
    expect(pageMatchesWorkflowFilter("proposal", "proposal")).toBe(true);
    expect(pageMatchesWorkflowFilter("landing", "proposal")).toBe(false);
    expect(pageMatchesWorkflowFilter("landing", "all")).toBe(true);
  });
});
