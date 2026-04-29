import { afterEach, describe, expect, it, vi } from "vitest";

describe("getApiUrl", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("defaults to localhost and appends /api/v1", async () => {
    const { getApiUrl } = await import("./api-url");
    expect(getApiUrl()).toBe("http://localhost:8000/api/v1");
  });

  it("does not duplicate /api/v1 when NEXT_PUBLIC_API_URL already includes it", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000/api/v1";
    const { getApiUrl } = await import("./api-url");
    expect(getApiUrl()).toBe("http://localhost:8000/api/v1");
  });

  it("strips trailing /API/v1 case-insensitively", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000/API/v1";
    const { getApiUrl } = await import("./api-url");
    expect(getApiUrl()).toBe("http://localhost:8000/api/v1");
  });

  it("normalizes trailing slashes before appending /api/v1", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000/";
    const { getApiUrl } = await import("./api-url");
    expect(getApiUrl()).toBe("http://localhost:8000/api/v1");
  });

  it("builds public page URLs without duplicating /api/v1", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.forge.test/api/v1/";
    const { getPublicPageApiUrl } = await import("./api-url");
    expect(getPublicPageApiUrl("acme", "spring-offer")).toBe(
      "https://api.forge.test/api/v1/public/pages/acme/spring-offer",
    );
  });

  it("builds public page URLs from a host-only API URL", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.forge.test";
    const { getPublicPageApiUrl } = await import("./api-url");
    expect(getPublicPageApiUrl("acme", "spring offer")).toBe(
      "https://api.forge.test/api/v1/public/pages/acme/spring%20offer",
    );
  });
});
