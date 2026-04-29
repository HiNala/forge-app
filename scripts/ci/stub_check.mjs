#!/usr/bin/env node
/**
 * Warn on unresolved stub markers in production source (AL-04 allowlist-backed).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

const SKIP_DIR = new Set(["node_modules", ".next", ".git", "__pycache__", ".venv", ".venv-ci", ".venv-forge"]);

function allowed(rel) {
  const raw = fs.readFileSync(path.join(ROOT, "scripts/ci/stub_allowlist.txt"), "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    if (rel.replace(/\\/g, "/").includes(t.replace(/\\/g, "/"))) return true;
  }
  return false;
}

const PATTERNS = [/NotImplementedError/g, /\bFIXME\b/g];

function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(p);
    else if (/\.(py|ts|tsx)$/.test(ent.name)) yield p;
  }
}

let failed = false;
for (const sub of ["apps/api/app", "apps/web/src"]) {
  const base = path.join(ROOT, sub);
  if (!fs.existsSync(base)) continue;
  for (const file of walk(base)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (allowed(rel)) continue;
    const raw = fs.readFileSync(file, "utf8");
    for (const re of PATTERNS) {
      if (re.test(raw)) {
        console.error(`${rel}: potential stub marker (${re})`);
        failed = true;
      }
      re.lastIndex = 0;
    }
  }
}

if (failed) {
  console.error("\nstub_check: extend stub_allowlist.txt or resolve markers.");
  process.exit(1);
}
console.log("stub_check OK");
