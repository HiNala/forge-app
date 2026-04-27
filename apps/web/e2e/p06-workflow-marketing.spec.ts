import { expect, test } from "@playwright/test";

/** P-06 — public marketing landings render (no auth). */
const SLUGS = [
  "link-in-bio",
  "survey",
  "quiz",
  "coming-soon",
  "gallery",
  "resume",
  "event-rsvp",
  "menu",
] as const;

test.describe("P-06 workflow marketing pages", () => {
  for (const slug of SLUGS) {
    test(`${slug} has primary heading`, async ({ page }) => {
      await page.goto(`/workflows/${slug}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
    });
  }

  test("workflows index lists link-in-bio", async ({ page }) => {
    await page.goto("/workflows", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Workflows/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Link in bio/i })).toBeVisible();
  });
});
