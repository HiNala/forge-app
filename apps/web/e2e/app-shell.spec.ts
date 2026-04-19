import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Mission FE-03 — app chrome when authenticated.
 * Without Clerk session, `/dashboard` redirects to sign-in; we skip axe in that case.
 */
test("axe: /dashboard (authenticated only)", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "load", timeout: 60_000 });
  if (page.url().includes("/signin")) {
    test.skip(true, "Not signed in — set Clerk keys in .env.local for full app-shell E2E");
  }
  const builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]);
  const { violations } = await builder.analyze();
  expect(violations, JSON.stringify(violations, null, 2)).toHaveLength(0);
});
