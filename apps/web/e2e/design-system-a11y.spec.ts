import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Mission FE-01 — axe on the dev-only design system matrix.
 * Requires `pnpm dev` (NODE_ENV=development) so `/dev/design-system` is not 404.
 */
test("axe: /dev/design-system", async ({ page }) => {
  await page.goto("/dev/design-system", { waitUntil: "load", timeout: 60_000 });
  if (page.url().includes("404") || (await page.title()).toLowerCase().includes("not found")) {
    test.skip(true, "Design system route not available (production build or NODE_ENV)");
  }
  const builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]);
  const { violations } = await builder.analyze();
  expect(violations, JSON.stringify(violations, null, 2)).toHaveLength(0);
});
