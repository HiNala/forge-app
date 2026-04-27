import { describe, expect, it } from "vitest";
import { WEB_CANVAS_ROW_DISPLAY_WIDTH, scaleForCanvasRow } from "./web-canvas-viewports";

describe("scaleForCanvasRow", () => {
  it("maps full desktop width to the fixed canvas row width", () => {
    const s = scaleForCanvasRow(1440);
    expect(s * 1440).toBeCloseTo(WEB_CANVAS_ROW_DISPLAY_WIDTH, 5);
  });
});
