export const PUBLIC_SRC_DOC_CSP = [
  "default-src 'none'",
  "script-src 'none'",
  "style-src 'unsafe-inline'",
  "img-src data: blob: https:",
  "font-src data: https:",
  "connect-src 'none'",
  "form-action 'self'",
  "frame-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
].join("; ");

export const PUBLIC_IFRAME_SANDBOX = "allow-forms allow-popups";

const CSP_META_RE = /<meta\b[^>]*http-equiv=["']content-security-policy["'][^>]*>/i;
const HEAD_OPEN_RE = /<head\b[^>]*>/i;

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function withPublicSrcDocSecurity(html: string): string {
  if (CSP_META_RE.test(html)) {
    return html;
  }
  const meta = `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(PUBLIC_SRC_DOC_CSP)}">`;
  const head = HEAD_OPEN_RE.exec(html);
  if (!head) {
    return `${meta}${html}`;
  }
  const insertAt = head.index + head[0].length;
  return `${html.slice(0, insertAt)}${meta}${html.slice(insertAt)}`;
}

