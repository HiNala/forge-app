import type { Page } from "@playwright/test";

/**
 * Intercept outbound LLM / streaming calls and return canned responses (extend per route).
 * Wire in specs that need deterministic Studio output.
 */
export async function mockLLM(page: Page): Promise<void> {
  await page.route("**/studio/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.continue();
      return;
    }
    // Default: do not block real traffic — override in specific tests.
    await route.continue();
  });
}
