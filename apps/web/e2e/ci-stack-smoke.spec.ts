import { expect, test } from "@playwright/test";

import { createTestOrg } from "../tests/e2e/helpers/seed";

/**
 * GL-03 — minimal smoke against a fully booted docker-compose.ci stack.
 * Requires: API with AUTH_TEST_BYPASS + FORGE_E2E_TOKEN, web on PLAYWRIGHT_BASE_URL.
 */
test.describe("ci stack smoke", () => {
  test("marketing home loads", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.locator("body")).toBeVisible();
  });

  test("E2E seed org (API)", async () => {
    test.skip(!process.env.FORGE_E2E_TOKEN, "Set FORGE_E2E_TOKEN for seed test");
    const org = await createTestOrg();
    expect(org.userId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(org.organizationId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(org.slug.length).toBeGreaterThan(0);
  });
});
