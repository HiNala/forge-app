import { afterEach, describe, expect, it, vi } from "vitest";

import { getApiUrl } from "./get-api-url";

describe("getApiUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to localhost:8000/api/v1 when unset or blank", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    expect(getApiUrl()).toBe("http://localhost:8000/api/v1");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "   ");
    expect(getApiUrl()).toBe("http://localhost:8000/api/v1");
  });

  it("normalizes origin only", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://127.0.0.1:8000");
    expect(getApiUrl()).toBe("http://127.0.0.1:8000/api/v1");
  });

  it("does not double /api/v1 when env already includes it", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api/v1");
    expect(getApiUrl()).toBe("http://localhost:8000/api/v1");
  });

  it("strips trailing slashes before appending", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com///");
    expect(getApiUrl()).toBe("https://api.example.com/api/v1");
  });
});
