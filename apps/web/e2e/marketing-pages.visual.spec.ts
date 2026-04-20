import { expect, test } from "@playwright/test";

/**
 * Visual regression (Mission FE-02). Opt-in so CI stays green without image baselines:
 * `SNAPSHOT_MARKETING=1 pnpm exec playwright test e2e/marketing-pages.visual.spec.ts --update-snapshots`
 */
test.skip(!process.env.SNAPSHOT_MARKETING, "Set SNAPSHOT_MARKETING=1 to run marketing visual snapshots");

test.describe("marketing visual snapshots", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  const cases: { path: string; name: string }[] = [
    { path: "/", name: "home" },
    { path: "/pricing", name: "pricing" },
    { path: "/examples", name: "examples" },
    { path: "/examples/contractor-small-jobs", name: "example-detail" },
    { path: "/terms", name: "terms" },
    { path: "/privacy", name: "privacy" },
  ];

  for (const { path, name } of cases) {
    for (const width of [375, 768, 1280] as const) {
      test(`${name} @ ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: Math.max(900, width) });
        await page.goto(path, { waitUntil: "networkidle", timeout: 90_000 });
        await expect(page).toHaveScreenshot(`${name}-${width}.png`, {
          fullPage: true,
          maxDiffPixels: 800,
        });
      });
    }
  }
});
