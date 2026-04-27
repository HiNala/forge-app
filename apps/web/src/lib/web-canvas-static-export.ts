/**
 * Single-file static HTML bundle for local preview / handoff (V2-P03 Phase 10, client MVP).
 * Full multi-file zip + Next.js export remains a server/build pipeline task.
 */

import { normalizeWebPath } from "@/lib/web-canvas-nav-graph";

export type StaticExportPage = { path: string; title: string; html: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sectionSlug(path: string): string {
  const n = normalizeWebPath(path);
  if (n === "/") return "home";
  return n.replace(/^\//, "").replace(/\//g, "-") || "page";
}

export function buildSingleFileStaticSite(
  pages: readonly StaticExportPage[],
  siteName: string,
  options?: { accent?: string; bg?: string; fg?: string },
): string {
  const accent = options?.accent ?? "#2563eb";
  const bg = options?.bg ?? "#ffffff";
  const fg = options?.fg ?? "#0f172a";
  const nav = pages
    .map((p) => {
      const slug = sectionSlug(p.path);
      return `<a href="#forge-page-${slug}">${escapeHtml(p.title)}</a>`;
    })
    .join("\n<span aria-hidden> · </span>\n");

  const sections = pages
    .map((p) => {
      const slug = sectionSlug(p.path);
      return `<section id="forge-page-${slug}" class="forge-static-page" data-path="${escapeHtml(normalizeWebPath(p.path))}">
<h2 class="forge-static-page-title">${escapeHtml(p.title)}</h2>
<div class="forge-static-page-body">${p.html}</div>
</section>`;
    })
    .join("\n\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(siteName)}</title>
  <style>
    :root { --accent:${accent}; --bg:${bg}; --fg:${fg}; }
    body { margin:0; font-family: system-ui, sans-serif; background:var(--bg); color:var(--fg); }
    .forge-export-nav { position:sticky; top:0; z-index:10; padding:12px 16px; background:var(--bg); border-bottom:1px solid rgba(0,0,0,.1); display:flex; flex-wrap:wrap; gap:8px; align-items:center; font-size:14px; }
    .forge-export-nav a { color:var(--accent); font-weight:600; text-decoration:none; }
    .forge-static-page { padding:24px 16px 48px; max-width:960px; margin:0 auto; border-bottom:1px solid rgba(0,0,0,.06); }
    .forge-static-page-title { font-size:1.25rem; margin:0 0 16px; }
    .forge-static-page-body { overflow:auto; }
  </style>
</head>
<body>
  <nav class="forge-export-nav" aria-label="Site">${nav}</nav>
  ${sections}
  <p style="padding:24px; font-size:12px; opacity:.6; text-align:center;">Exported from Forge (preview). Forms use Forge when hosted; replace action URLs for fully static hosting.</p>
</body>
</html>`;
}
