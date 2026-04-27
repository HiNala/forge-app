import { describe, expect, it } from "vitest";
import { collectForgeHits, domRectToRect, marqueeCoverageRatio } from "./web-marquee-hit";
import { rectsOverlap } from "./mobile-marquee";

describe("domRectToRect", () => {
  it("maps DOMRect fields to Rect", () => {
    expect(domRectToRect({ left: 10, top: 20, width: 30, height: 40 })).toEqual({
      x: 10,
      y: 20,
      w: 30,
      h: 40,
    });
  });
});

describe("collectForgeHits", () => {
  it("returns hits for elements overlapping marquee in viewport space", () => {
    document.body.innerHTML = "";
    const root = document.createElement("div");
    const a = document.createElement("p");
    a.setAttribute("data-forge-node-id", "alpha");
    a.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 50,
        height: 50,
        right: 50,
        bottom: 50,
        x: 0,
        y: 0,
        toJSON: () => "",
      }) as DOMRect;

    const b = document.createElement("p");
    b.setAttribute("data-forge-node-id", "beta");
    b.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 100,
        width: 20,
        height: 20,
        right: 120,
        bottom: 120,
        x: 100,
        y: 100,
        toJSON: () => "",
      }) as DOMRect;

    root.append(a, b);
    document.body.append(root);

    const hits = collectForgeHits(root, { x0: 40, y0: 40, x1: 60, y1: 60 });
    expect(hits.map((h) => h.forgeNodeId)).toEqual(["alpha"]);
  });
});

describe("marqueeCoverageRatio", () => {
  it("is ~1 when marquee fully covers container", () => {
    const el = document.createElement("div");
    el.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => "",
      }) as DOMRect;
    const r = marqueeCoverageRatio(el, { x0: 0, y0: 0, x1: 100, y1: 100 });
    expect(r).toBeGreaterThan(0.99);
  });
});

describe("rectsOverlap (sanity for web marquee)", () => {
  it("overlaps on shared edge", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 5, h: 5 })).toBe(false);
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 0, w: 5, h: 5 })).toBe(true);
  });
});
