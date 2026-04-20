import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Clerk embeds third-party UI on auth routes — axe those manually if needed. */
const MARKETING_PATHS = ["/", "/pricing", "/examples", "/terms", "/privacy"] as const;

test.describe("marketing axe", () => {
  for (const path of MARKETING_PATHS) {
    test(`axe: ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "load", timeout: 90_000 });
      const builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]);
      const { violations } = await builder.analyze();
      expect(violations, JSON.stringify(violations, null, 2)).toHaveLength(0);
    });
  }
});
