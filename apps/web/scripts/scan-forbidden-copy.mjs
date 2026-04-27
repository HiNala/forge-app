/**
 * Fails if deprecated positioning or banned filler words appear in user-facing sources.
 * Run: pnpm copy:check (from apps/web)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "src");

const BANNED = [
  { re: /\bAI page builder\b/gi, msg: 'deprecated phrase "AI page builder"' },
  { re: /\bseamless\b/gi, msg: 'banned word "seamless"' },
  { re: /\belevate\b/gi, msg: 'banned word "elevate"' },
  { re: /\bleverage\b/gi, msg: 'banned word "leverage"' },
];

const EXT = new Set([".tsx", ".ts", ".mdx"]);

function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      yield* walk(p);
    } else if (EXT.has(path.extname(ent.name))) {
      yield p;
    }
  }
}

let failed = false;
for (const file of walk(ROOT)) {
  const raw = fs.readFileSync(file, "utf8");
  for (const { re, msg } of BANNED) {
    if (re.test(raw)) {
      console.error(`${path.relative(ROOT, file)}: ${msg}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}
console.log("copy:check OK");
