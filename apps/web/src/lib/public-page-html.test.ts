import { describe, expect, it } from "vitest";

import { PUBLIC_IFRAME_SANDBOX, PUBLIC_SRC_DOC_CSP, withPublicSrcDocSecurity } from "./public-page-html";

describe("withPublicSrcDocSecurity", () => {
  it("injects a CSP meta tag immediately after the head tag", () => {
    const html = "<!doctype html><html><head><title>A</title></head><body>ok</body></html>";
    const out = withPublicSrcDocSecurity(html);
    expect(out).toContain('<head><meta http-equiv="Content-Security-Policy"');
    expect(out).toContain(PUBLIC_SRC_DOC_CSP);
  });

  it("does not duplicate an existing CSP meta tag", () => {
    const html =
      '<html><head><meta http-equiv="Content-Security-Policy" content="default-src none"></head><body></body></html>';
    expect(withPublicSrcDocSecurity(html)).toBe(html);
  });

  it("prepends CSP if a malformed document has no head", () => {
    const out = withPublicSrcDocSecurity("<body>ok</body>");
    expect(out.startsWith('<meta http-equiv="Content-Security-Policy"')).toBe(true);
  });

  it("keeps public srcdoc scriptless and network-restricted", () => {
    expect(PUBLIC_SRC_DOC_CSP).toContain("script-src 'none'");
    expect(PUBLIC_SRC_DOC_CSP).toContain("connect-src 'none'");
    expect(PUBLIC_SRC_DOC_CSP).toContain("form-action 'self'");
    expect(PUBLIC_SRC_DOC_CSP).not.toContain("http:");
    expect(PUBLIC_SRC_DOC_CSP).not.toContain("unsafe-inline' http");
  });

  it("does not grant same-origin or scripts to public iframes", () => {
    expect(PUBLIC_IFRAME_SANDBOX).toBe("allow-forms allow-popups");
    expect(PUBLIC_IFRAME_SANDBOX).not.toContain("allow-same-origin");
    expect(PUBLIC_IFRAME_SANDBOX).not.toContain("allow-scripts");
  });
});

