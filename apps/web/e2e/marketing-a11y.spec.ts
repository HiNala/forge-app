import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

/** Public marketing routes (Mission FE-02). Auth pages may embed Clerk; we scope exclusions if needed. */
const PATHS = [
  "/",
  "/pricing",
  "/examples",
  "/examples/contractor-small-jobs",
  "/signin",
  "/signup",
  "/terms",
  "/privacy",
] as const;

for (const path of PATHS) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "load", timeout: 60_000 });
    const builder = new AxeBuilder({ page }).withTags([
      "wcag2a",
      "wcag2aa",
      "wcag21aa",
    ]);

    if (path === "/signin" || path === "/signup") {
      builder.exclude("iframe");
    }

    const { violations } = await builder.analyze();
    expect(violations, JSON.stringify(violations, null, 2)).toHaveLength(0);
  });
}
