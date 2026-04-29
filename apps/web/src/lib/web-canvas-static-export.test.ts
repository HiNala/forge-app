import { strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import {
  assignExportFilenames,
  buildMultiPageStaticFiles,
  buildMultiPageStaticZip,
  buildSingleFileStaticSite,
} from "./web-canvas-static-export";

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
  it("places each page under a deterministic .html name with relative cross-links", () => {
    const files = buildMultiPageStaticFiles(
      [
        { path: "/", title: "Home", html: "<p>Hi</p>" },
        { path: "/about", title: "About", html: "<p>Us</p>" },
      ],
      "Demo",
    );
    expect(Object.keys(files).sort()).toEqual(["about.html", "index.html"]);
    const index = strFromU8(files["index.html"]!);
    expect(index).toContain('href="./about.html"');
    expect(index).toContain("<p>Hi</p>");
    const about = strFromU8(files["about.html"]!);
    expect(about).toContain('href="./index.html"');
    expect(about).toContain("<p>Us</p>");
  });

  it("buildMultiPageStaticZip returns a PK ZIP from the same entry map as buildMultiPageStaticFiles", () => {
    const pages = [
      { path: "/", title: "Home", html: "<p>A</p>" },
      { path: "/pricing", title: "Pricing", html: "<p>B</p>" },
    ];
    const files = buildMultiPageStaticFiles(pages, "Site");
    const zipped = buildMultiPageStaticZip(pages, "Site");
    expect(zipped[0]).toBe(0x50);
    expect(zipped[1]).toBe(0x4b);
    expect(zipped.length).toBeGreaterThan(64);
    expect(Object.keys(files).sort()).toEqual(["index.html", "pricing.html"]);
  });

  it("assignExportFilenames maps home to index.html", () => {
    const m = assignExportFilenames([{ path: "/", title: "H", html: "" }]);
    expect(m.get("/")).toBe("index.html");
  });
});
