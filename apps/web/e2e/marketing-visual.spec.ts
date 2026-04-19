import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "375", width: 375, height: 900 },
  { name: "768", width: 768, height: 900 },
  { name: "1280", width: 1280, height: 900 },
] as const;

const PAGES = [
  { path: "/", file: "landing" },
  { path: "/pricing", file: "pricing" },
  { path: "/examples", file: "examples" },
  { path: "/examples/contractor-small-jobs", file: "example-detail" },
  { path: "/terms", file: "terms" },
  { path: "/privacy", file: "privacy" },
] as const;

for (const vp of VIEWPORTS) {
  for (const pg of PAGES) {
    test(`screenshot ${pg.file} @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(pg.path, { waitUntil: "load", timeout: 60_000 });
      await expect(page).toHaveScreenshot(`${pg.file}-${vp.name}.png`, {
        fullPage: true,
        maxDiffPixels: 400,
        animations: "disabled",
      });
    });
  }
}
