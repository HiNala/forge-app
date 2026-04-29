#!/usr/bin/env node
/**
 * User-facing forbidden positioning strings under `apps/` (AL-04).
 * Run from repo root: node scripts/ci/forbidden_copy_check.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

const SKIP_DIR = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  ".venv",
  ".venv-ci",
  "__pycache__",
]);

const EXT = /\.(tsx|ts|jsx|js|py)$/i;

/** Only product code — excludes historical audit prose in `docs/`. */
const SCAN_SUBDIRS = ["apps/web/src", "apps/web/public", "apps/api/app"];
const ALLOWLIST_FILE = path.join(__dirname, "forbidden_copy_allowlist.txt");

const BANNED = [
  /\bAI page builder\b/gi,
  /\bpage builder\b/gi,
  /page-builder/gi,
  /\bForge\b/g,
  /\bForge Credits?\b/g,
  /forge\.app/gi,
  /api\.forge\.app/gi,
  /app\.forge\.app/gi,
  /noreply@forge\.app/gi,
];

function globToRegExp(glob) {
  const doubleStar = "__DOUBLE_STAR__";
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replaceAll("**", doubleStar);
  return new RegExp(`^${escaped.replaceAll("*", "[^/]*").replaceAll(doubleStar, ".*")}$`);
}

const allowlist = fs.existsSync(ALLOWLIST_FILE)
  ? fs
      .readFileSync(ALLOWLIST_FILE, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
  : [];

function isAllowed(rel, line) {
  const normalizedRel = rel.replaceAll(path.sep, "/");
  const candidate = `${normalizedRel}:${line}`;
  return allowlist.some((entry) => {
    const normalizedEntry = entry.replaceAll("\\", "/");
    if (normalizedEntry.includes("*")) {
      return globToRegExp(normalizedEntry).test(normalizedRel) || globToRegExp(normalizedEntry).test(candidate);
    }
    return normalizedRel.includes(normalizedEntry) || candidate.includes(normalizedEntry) || line.includes(normalizedEntry);
  });
}

function* walk(dir) {
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of ents) {
    if (SKIP_DIR.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(p);
    else if (EXT.test(ent.name)) yield p;
  }
}

let failed = false;
for (const sub of SCAN_SUBDIRS) {
  const base = path.join(ROOT, sub);
  if (!fs.existsSync(base)) continue;
  for (const file of walk(base)) {
    const rel = path.relative(ROOT, file);
    const raw = fs.readFileSync(file, "utf8");
    const lines = raw.split(/\r?\n/);
    for (const re of BANNED) {
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (re.test(line) && !isAllowed(rel, line)) {
          console.error(`${rel}:${index + 1}: matches ${String(re)}`);
          failed = true;
        }
        re.lastIndex = 0;
      }
    }
  }
}

if (failed) {
  console.error("\nforbidden_copy_check failed — use mini-app platform phrasing.");
  process.exit(1);
}
console.log("forbidden_copy_check OK");
