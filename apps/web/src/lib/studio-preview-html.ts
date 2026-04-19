/**
 * Wrap streamed fragments into a full HTML document for iframe srcDoc.
 * Optionally injects the Studio section bridge for postMessage editing.
 */

export function wrapStudioPreviewHtml(
  bodyFragments: string,
  opts?: {
    /** Inject bridge script (same-origin) for section hover/click. */
    withBridge?: boolean;
    /** e.g. https://app.example.com — required when withBridge is true (browser only). */
    origin?: string;
  },
): string {
  const bridge =
    opts?.withBridge && opts.origin
      ? `<script src="${opts.origin}/p/-internal/studio-bridge.js" defer data-forge-studio="1"><\/script>`
      : "";
  return `<!DOCTYPE html><html lang="en" data-forge-preview="studio"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>body{margin:0;font-family:system-ui,sans-serif;background:#fafafa;color:#111;} [data-forge-section]{transition:opacity 0.3s ease;}</style></head><body>${bodyFragments}${bridge}</body></html>`;
}

const BRIDGE_MARKER = "studio-bridge.js";

/** Ensure the Studio iframe bridge is present on a full HTML document from the server. */
export function ensureBridgeInFullDocument(html: string, origin: string): string {
  if (html.includes(BRIDGE_MARKER)) return html;
  if (/<\/body>/i.test(html)) {
    const inject = `<script src="${origin}/p/-internal/studio-bridge.js" defer data-forge-studio="1"><\/script>`;
    return html.replace(/<\/body>/i, `${inject}</body>`);
  }
  return html;
}

export function parseSectionIds(html: string): string[] {
  const re = /data-forge-section="([^"]+)"/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

/** Extract a single section's outer HTML from a full page document (for iframe postMessage patches). */
export function extractSectionOuterHtml(full: string, sectionId: string): string | null {
  try {
    const doc = new DOMParser().parseFromString(full, "text/html");
    const safe =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(sectionId)
        : sectionId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const el = doc.querySelector(`[data-forge-section="${safe}"]`);
    return el?.outerHTML ?? null;
  } catch {
    return null;
  }
}
