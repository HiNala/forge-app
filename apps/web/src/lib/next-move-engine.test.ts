import { describe, expect, it } from "vitest";
import { computeNextMoves, pickNextMove } from "@/lib/next-move-engine";

describe("next-move-engine", () => {
  it("suggests sketching flow when intent is shallow", () => {
    const moves = computeNextMoves({
      pageTitle: "Test",
      pageType: "landing",
      status: "draft",
      fourLayer: null,
      flowLooksEmpty: true,
    });
    expect(moves.some((m) => m.id === "sketch-first-minutes")).toBe(true);
    expect(pickNextMove(moves)?.id).toBe("sketch-first-minutes");
  });

  it("suggests accessibility refine when quality score is low", () => {
    const moves = computeNextMoves({
      pageTitle: "Test",
      pageType: "landing",
      status: "draft",
      qualityScore: 50,
      flowLooksEmpty: false,
    });
    expect(moves.some((m) => m.id === "quality-accessibility")).toBe(true);
  });
});
