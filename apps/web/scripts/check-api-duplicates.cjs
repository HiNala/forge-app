/**
 * Fails if src/lib/api.ts declares the same exported function name twice (merge-artifact guard).
 * Run via: pnpm typecheck (apps/web)
 */
const fs = require("fs");
const path = require("path");

const apiPath = path.join(__dirname, "..", "src", "lib", "api.ts");
const src = fs.readFileSync(apiPath, "utf8");
function dupesOf(re, label) {
  const names = [...src.matchAll(re)].map((m) => m[1]);
  const seen = new Set();
  const dups = new Set();
  for (const n of names) {
    if (seen.has(n)) dups.add(n);
    seen.add(n);
  }
  if (dups.size) {
    console.error(`Duplicate exported ${label} in src/lib/api.ts:`, [...dups].sort().join(", "));
    process.exit(1);
  }
}

dupesOf(/^export (?:async )?function (\w+)/gm, "function names");
dupesOf(/^export type (\w+)/gm, "type names");
