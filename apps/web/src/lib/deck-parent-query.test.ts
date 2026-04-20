import { describe, expect, it } from "vitest";

import { injectDeckParentSearchParams } from "./deck-parent-query";

describe("injectDeckParentSearchParams", () => {
  it("injects parent search when deck markup present", () => {
    const html = "<html><head></head><body><div class='forge-deck-root'></div></body></html>";
    const out = injectDeckParentSearchParams(html, { mode: "present" });
    expect(out).toContain("__FORGE_PARENT_SEARCH__");
    expect(out).toContain("mode=present");
  });

  it("is a no-op without deck markers", () => {
    const html = "<html><head></head><body><p>Hi</p></body></html>";
    const out = injectDeckParentSearchParams(html, { mode: "present" });
    expect(out).toBe(html);
  });
});
