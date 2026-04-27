import { describe, expect, it } from "vitest";
import {
  collectInternalNavTargetsFromHtml,
  normalizeWebPath,
  orphanPageIds,
} from "./web-canvas-nav-graph";

describe("normalizeWebPath", () => {
  it("normalizes root and trims slashes", () => {
    expect(normalizeWebPath("/")).toBe("/");
    expect(normalizeWebPath("about")).toBe("/about");
    expect(normalizeWebPath("/pricing/")).toBe("/pricing");
  });
});

describe("collectInternalNavTargetsFromHtml", () => {
  it("finds internal anchors", () => {
    const html = `<div><a href="/about">About</a><a href="https://ex.com/x">X</a><a href="/pricing">P</a></div>`;
    const t = collectInternalNavTargetsFromHtml(html);
    expect(t.map((x) => x.path).sort()).toEqual(["/about", "/pricing"]);
  });
});

describe("orphanPageIds", () => {
  it("excludes home and pages with incoming edges", () => {
    const ids = ["a", "b", "c"];
    const edges = [{ source: "a", target: "b" }];
    expect(orphanPageIds(ids, "a", edges).sort()).toEqual(["c"]);
  });
});
