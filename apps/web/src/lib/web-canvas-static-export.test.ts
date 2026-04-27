import { describe, expect, it } from "vitest";
import { buildSingleFileStaticSite } from "./web-canvas-static-export";

describe("buildSingleFileStaticSite", () => {
  it("includes nav hash links and page sections", () => {
    const html = buildSingleFileStaticSite(
      [
        { path: "/", title: "Home", html: "<p>Hi</p>" },
        { path: "/about", title: "About", html: "<p>Us</p>" },
      ],
      "Demo",
    );
    expect(html).toContain('id="forge-page-home"');
    expect(html).toContain('href="#forge-page-about"');
    expect(html).toContain("<p>Hi</p>");
  });
});
