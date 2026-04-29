import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: `@/lib/api` re-exports URL helpers — keep in sync with `api-url` (AL-01).
 */
describe("API module URL exports", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("getApiUrl from api.ts matches duplicated /api/v1 guard", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/api/v1";
    const mod = await import("./api");
    const bare = await import("./api-url");
    expect(mod.getApiUrl()).toBe(bare.getApiUrl());
    expect(mod.getPublicPageApiUrl("o", "p")).toBe(bare.getPublicPageApiUrl("o", "p"));
    expect(mod.getAnalyticsTrackUrl()).toBe(bare.getAnalyticsTrackUrl());
  });

  it("normalizeApiOrigin strips suffix case-insensitively", async () => {
    const { normalizeApiOrigin } = await import("./api");
    expect(normalizeApiOrigin("https://x/API/v1")).toBe("https://x");
  });
});
