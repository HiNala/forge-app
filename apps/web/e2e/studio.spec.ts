import { test, expect } from "@playwright/test";

test.describe("Studio (anonymous)", () => {
  test("draft preview route prompts sign-in when logged out", async ({ page }) => {
    await page.goto("/p/demo-org/demo-page?preview=true", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Sign in to preview")).toBeVisible({ timeout: 60_000 });
  });
});
