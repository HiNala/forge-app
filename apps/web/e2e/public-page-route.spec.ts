import { expect, test } from "@playwright/test";

/**
 * AL-01 — Smoke: `/p/[org]/[slug]` route resolves (Next shell + notFound for missing draft).
 * Full publish flow needs API + seed; URL construction regressions are covered in Vitest (`api-url.test.ts`).
 */
test.describe("public published page route", () => {
  test("unknown org/slug returns 404 or client shell", async ({ page }) => {
    const res = await page.goto("/p/_e2e-missing-org_/_missing-slug_", { waitUntil: "domcontentloaded" });
    const status = res?.status() ?? 0;
    expect([404, 200].includes(status)).toBe(true);
    await expect(page.locator("body")).toBeVisible();
  });
});
