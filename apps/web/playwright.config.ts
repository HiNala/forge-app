import fs from "node:fs";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const appDir = path.resolve(__dirname);

/** Load `.env.local` / `.env` so `webServer` inherits first-party auth and API settings. */
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

/** Full stack from docker-compose.ci — do not start Next inside Playwright. */
const useExternalApp = process.env.PLAYWRIGHT_EXTERNAL_APP === "1";

/** Set `PLAYWRIGHT_FULL_MATRIX=1` to run Firefox/WebKit + mobile (default: Chromium only). */
const fullMatrix = process.env.PLAYWRIGHT_FULL_MATRIX === "1";

const browserProjects = [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  { name: "webkit", use: { ...devices["Desktop Safari"] } },
  {
    name: "Pixel 8",
    use: { ...devices["Pixel 8"] },
  },
  {
    name: "iPhone 15",
    use: { ...devices["iPhone 15"] },
  },
];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? [["html"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: process.env.CI ? "retain-on-failure" : "off",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  projects: fullMatrix
    ? browserProjects
    : [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  /**
   * Production server — lazy hero + stable chunks for E2E.
   * In CI without external stack, build first so `next start` always has `.next`.
   */
  webServer: useExternalApp
    ? undefined
    : {
        command: useNextDevServer
          ? "pnpm exec next dev --hostname 127.0.0.1 --port 3000"
          : process.env.CI
            ? "pnpm exec next build && pnpm exec next start --hostname 127.0.0.1 --port 3000"
            : "pnpm exec next start --hostname 127.0.0.1 --port 3000",
        cwd: appDir,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        /** Playwright expects a `{ [k: string]: string }` map, so drop undefined values. */
        env: Object.fromEntries(
          Object.entries(process.env).filter(([, v]) => typeof v === "string"),
        ) as Record<string, string>,
      },
});
