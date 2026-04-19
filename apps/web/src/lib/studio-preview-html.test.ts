import { describe, expect, it } from "vitest";

import { extractSectionOuterHtml } from "./studio-preview-html";

describe("extractSectionOuterHtml", () => {
  it("returns outer HTML for a section id", () => {
    const html = `<!DOCTYPE html><html><body>
      <div data-forge-section="hero-centered-0"><p>Old</p></div>
      <div data-forge-section="form-vertical-1"><form></form></div>
    </body></html>`;
    const out = extractSectionOuterHtml(html, "hero-centered-0");
    expect(out).toContain("data-forge-section");
    expect(out).toContain("Old");
  });
});
