import { describe, expect, it } from "vitest";
import {
  getPageDetailConfig,
  getWorkflowFamily,
  workflowFilterMatchesPage,
} from "./workflow-config";

describe("getWorkflowFamily", () => {
  it("groups booking and contact", () => {
    expect(getWorkflowFamily("booking-form")).toBe("contact");
    expect(getWorkflowFamily("contact-form")).toBe("contact");
  });
  it("detects proposal and deck", () => {
    expect(getWorkflowFamily("proposal")).toBe("proposal");
    expect(getWorkflowFamily("pitch_deck")).toBe("deck");
  });
});

describe("workflowFilterMatchesPage", () => {
  it("scopes dashboard rows", () => {
    expect(workflowFilterMatchesPage("proposal", "proposal")).toBe(true);
    expect(workflowFilterMatchesPage("proposal", "contact-form")).toBe(false);
  });
});

describe("getPageDetailConfig", () => {
  it("renames submissions for proposals", () => {
    expect(getPageDetailConfig("proposal").submissionsTabLabel).toContain("Viewers");
  });
  it("uses export tab for decks", () => {
    const d = getPageDetailConfig("pitch_deck");
    expect(d.exportTabInsteadOfAutomations).toBe(true);
  });
});
