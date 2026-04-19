import fs from "node:fs";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const appDir = path.resolve(__dirname);

/** Load `.env.local` / `.env` so `webServer` inherits real Clerk keys (placeholders are rejected by Clerk). */
function mergeEnvFile(relative: string) {
  const full = path.join(appDir, relative);
  if (!fs.existsSync(full)) return;
  const text = fs.readFileSync(full, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

mergeEnvFile(".env.local");
mergeEnvFile(".env");

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

/** `next dev` so routes gated with `NODE_ENV !== "production"` (e.g. `/dev/design-system`) exist for axe E2E. */
const useNextDevServer = process.env.PLAYWRIGHT_NEXT_DEV === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  projects: [{ name: "chromium", use: {} }],
  /**
   * Production server — lazy hero + stable chunks for E2E.
   * In CI, build first so `next start` always has `.next`.
   */
  webServer: {
    command: useNextDevServer
      ? "pnpm exec next dev --hostname 127.0.0.1 --port 3000"
      : process.env.CI
        ? "pnpm exec next build && pnpm exec next start --hostname 127.0.0.1 --port 3000"
        : "pnpm exec next start --hostname 127.0.0.1 --port 3000",
    cwd: appDir,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    /** Subprocess does not inherit the parent shell — pass merged env (incl. Clerk from `.env.local`). */
    env: { ...process.env },
  },
});
