import { describe, expect, it } from "vitest";
import { normalizeRect, rectsOverlap, selectOverlapping, type Rect } from "./mobile-marquee";

describe("normalizeRect", () => {
  it("normalizes inverted drag direction", () => {
    const r = normalizeRect({ x0: 10, y0: 20, x1: 0, y1: 0 });
    expect(r).toEqual({ x: 0, y: 0, w: 10, h: 20 });
  });
});

describe("rectsOverlap", () => {
  it("returns false when separated", () => {
    const a: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const b: Rect = { x: 20, y: 0, w: 10, h: 10 };
    expect(rectsOverlap(a, b)).toBe(false);
  });
  it("returns true when one pixel column overlaps", () => {
    const a: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const b: Rect = { x: 9, y: 0, w: 5, h: 5 };
    expect(rectsOverlap(a, b)).toBe(true);
  });
});

describe("selectOverlapping", () => {
  it("returns empty for null or too-small marquee", () => {
    const els: Rect[] = [{ x: 0, y: 0, w: 20, h: 20 }];
    expect(selectOverlapping(els, null)).toEqual([]);
    expect(selectOverlapping(els, { x: 0, y: 0, w: 0, h: 4 })).toEqual([]);
  });
  it("returns all indices that share area with the marquee", () => {
    const els: Rect[] = [
      { x: 0, y: 0, w: 8, h: 8 },
      { x: 20, y: 0, w: 8, h: 8 },
      { x: 0, y: 20, w: 8, h: 8 },
    ];
    const marquee: Rect = { x: 5, y: 5, w: 30, h: 30 };
    expect(selectOverlapping(els, marquee).sort()).toEqual([0, 1, 2]);
  });
});
