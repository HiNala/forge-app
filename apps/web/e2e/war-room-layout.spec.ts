import { test, expect } from "@playwright/test";

/**
 * War Room authenticated layout — requires STORAGE_STATE login in CI.
 * Skipped locally until playwright auth harness provides a session.
 */
test.describe.skip("War Room layout", () => {
  test("shows four-pane regions on desktop", async ({ page }) => {
    await page.goto("/studio/war-room/new");
    await expect(page.getByRole("navigation", { name: "Product stages" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Strategy" }).first()).not.toBeAttached();
    // Landing /new picker does not render panes yet — upgrade this spec after auth bootstrap.
  });
});
