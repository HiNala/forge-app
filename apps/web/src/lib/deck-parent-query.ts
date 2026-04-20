/**
 * Published decks load inside Next.js via `iframe` + `srcDoc`. Query params live on the
 * parent URL (`/p/org/slug?mode=present`) but not on `about:srcdoc`, so we inject a tiny
 * bootstrap that sets `window.__FORGE_PARENT_SEARCH__` before the deck runtime runs.
 */
const DECK_MARKERS = ["forge-deck-root", "data-forge-deck=", "class='forge-deck-root'"];

function looksLikeDeckHtml(html: string): boolean {
  return DECK_MARKERS.some((m) => html.includes(m));
}

export function injectDeckParentSearchParams(
  html: string,
  params: Record<string, string | string[] | undefined>,
): string {
  const q = new URLSearchParams();
  for (const key of ["mode", "notes", "presenter"]) {
    const v = params[key];
    if (v === undefined) continue;
    const s = Array.isArray(v) ? v[0] : v;
    if (s) q.set(key, s);
  }
  const qs = q.toString();
  if (!qs || !looksLikeDeckHtml(html)) return html;

  const safe = `?${qs}`;
  const script = `<script data-forge-parent-query="">try{window.__FORGE_PARENT_SEARCH__=${JSON.stringify(
    safe,
  )};}catch(e){}</script>`;

  if (html.includes("</head>")) {
    return html.replace("</head>", `${script}</head>`);
  }
  return script + html;
}
