import { expect, test } from "@playwright/test";

/**
 * Hero demo: chip submit → preview iframe fills (live SSE or static demo-cache fallback).
 */
test("hero: booking chip fills preview and CTA links to signup", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("button", { name: "Booking form" }).click();
  const iframe = page.locator('iframe[title="Page preview"]');
  await expect(iframe).toBeVisible({ timeout: 90_000 });
  const frame = page.frameLocator('iframe[title="Page preview"]');
  await expect(frame.locator("body")).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () => (await frame.locator("body").innerText()).trim().length)
    .toBeGreaterThan(20);

  const startFree = page.getByRole("link", { name: "Start free" }).first();
  await expect(startFree).toBeVisible();
  await expect(startFree).toHaveAttribute("href", /\/signup\?.*source=hero_demo/);
});

test("final CTA links to signup", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator("#cta").scrollIntoViewIfNeeded();
  const cta = page.getByRole("link", { name: "Start free" }).last();
  await expect(cta).toHaveAttribute("href", /\/signup\?.*source=landing_footer/);
});
