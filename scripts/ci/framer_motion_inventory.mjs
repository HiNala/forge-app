#!/usr/bin/env node
/**
 * BP-05 — Prints every `.tsx`/`.ts` file that imports `framer-motion` for manual MOTION_SYSTEM review.
 * Always exits 0 — informational only.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const webSrc = path.join(repoRoot, "apps", "web", "src");
const files = fs.existsSync(webSrc) ? walk(webSrc) : [];
const hits = [];
for (const f of files) {
  try {
    const txt = fs.readFileSync(f, "utf8");
    if (/from\s+["']framer-motion["']/.test(txt)) hits.push(path.relative(repoRoot, f));
  } catch {
    /* ignore */
  }
}

hits.sort();

// eslint-disable-next-line no-console
console.log("[BP-05 framer-motion inventory]\n");
if (hits.length === 0) {
  console.log("No framer-motion imports under apps/web/src.\n");
} else {
  hits.forEach((h) => console.log(h));
  console.log(`\nTotal: ${hits.length}. Cross-check against docs/brand/MOTION_SYSTEM.md allowlist.\n`);
}
