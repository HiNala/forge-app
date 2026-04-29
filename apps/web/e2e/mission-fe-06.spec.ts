/**
 * Mission FE-06 — E2E placeholders.
 * Full flows need a first-party auth session + API + Stripe test mode. Run locally with:
 * - PLAYWRIGHT_BASE_URL + signed-in storageState, or
 * - CI secrets for forge_test_headers equivalent in browser.
 */
import { expect, test } from "@playwright/test";

test.describe.skip("FE-06 (auth + Stripe required)", () => {
  test("Stripe test checkout updates plan after webhook", async ({ page }) => {
    await page.goto("/settings/billing");
    await expect(page.getByRole("heading", { name: /Billing/i })).toBeVisible();
    // … complete checkout; poll plan until webhook processed …
  });

  test("invite team member → accept → appears in list", async ({ page }) => {
    await page.goto("/settings/team");
    // … send invite … open mocked link … assert membership …
  });

  test("brand kit edits persist after reload", async ({ page }) => {
    await page.goto("/settings/brand");
    // … change swatch … reload … assert saved …
  });
});
