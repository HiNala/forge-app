import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { assignExportFilenames, buildMultiPageStaticZip, buildSingleFileStaticSite } from "./web-canvas-static-export";

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

describe("buildMultiPageStaticZip", () => {
  it("produces index.html and relative-linked siblings", () => {
    const zip = buildMultiPageStaticZip(
      [
        { path: "/", title: "Home", html: "<p>Hi</p>" },
        { path: "/about", title: "About", html: "<p>Us</p>" },
      ],
      "Demo",
    );
    const out = unzipSync(zip);
    expect(Object.keys(out).sort()).toEqual(["about.html", "index.html"]);
    const index = strFromU8(out["index.html"]!);
    expect(index).toContain('href="./about.html"');
    expect(index).toContain("<p>Hi</p>");
    const about = strFromU8(out["about.html"]!);
    expect(about).toContain('href="./index.html"');
    expect(about).toContain("<p>Us</p>");
  });

  it("assignExportFilenames maps home to index.html", () => {
    const m = assignExportFilenames([{ path: "/", title: "H", html: "" }]);
    expect(m.get("/")).toBe("index.html");
  });
});
