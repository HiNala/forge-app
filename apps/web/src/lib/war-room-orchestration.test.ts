import { describe, expect, it } from "vitest";
import { orchestrationAgentToPane } from "@/lib/war-room-orchestration";

describe("orchestrationAgentToPane", () => {
  it("maps intent and strategy to strategy pane", () => {
    expect(orchestrationAgentToPane("intent")).toBe("strategy");
    expect(orchestrationAgentToPane("strategy")).toBe("strategy");
  });

  it("maps system to system pane", () => {
    expect(orchestrationAgentToPane("system")).toBe("system");
  });

  it("maps synthesis agents to canvas", () => {
    expect(orchestrationAgentToPane("ui")).toBe("canvas");
    expect(orchestrationAgentToPane("code")).toBe("canvas");
    expect(orchestrationAgentToPane("unknown")).toBe("canvas");
  });
});
