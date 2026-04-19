import { test, expect, type Page } from "@playwright/test";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Cache-Control",
} as const;

/** Stub anonymous demo SSE so E2E does not depend on the Python API. */
function stubPublicDemo(page: Page) {
  return page.route("**/public/demo", async (route) => {
    const method = route.request().method();
    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: { ...cors } });
      return;
    }
    if (method !== "POST") {
      await route.continue();
      return;
    }
    const html =
      "<!DOCTYPE html><html><head><meta charset='utf-8'/></head><body><p>Playwright demo preview</p></body></html>";
    const chunk = [
      "event: html.complete",
      `data: ${JSON.stringify({ html })}`,
      "",
      "",
    ].join("\n");
    await route.fulfill({
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
      },
      body: chunk,
    });
  });
}

test.describe("Hero demo funnel", () => {
  test("chip submit renders preview then Start free → signup", async ({ page }) => {
    test.setTimeout(180_000);
    await stubPublicDemo(page);

    await page.goto("/", { waitUntil: "load" });

    const bookingChip = page.getByRole("button", { name: "Booking form" });
    await expect(bookingChip).toBeVisible({ timeout: 120_000 });
    await bookingChip.click();

    const preview = page.frameLocator('iframe[title="Page preview"]');
    await expect(preview.getByText("Playwright demo preview")).toBeVisible({
      timeout: 45_000,
    });

    await page
      .getByRole("link", { name: "Like what you see? Start free" })
      .click();

    await expect(page).toHaveURL(/\/signup\?.*source=hero_demo/);
  });
});
