import { describe, expect, it } from "vitest";
import { isProtectedPath } from "./protected-routes";

describe("isProtectedPath", () => {
  it("treats app roots as protected", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/onboarding")).toBe(true);
    expect(isProtectedPath("/studio")).toBe(true);
  });

  it("matches nested routes", () => {
    expect(isProtectedPath("/pages/foo-bar")).toBe(true);
    expect(isProtectedPath("/settings/billing")).toBe(true);
  });

  it("ignores query string", () => {
    expect(isProtectedPath("/dashboard?x=1")).toBe(true);
  });

  it("allows marketing and auth routes", () => {
    expect(isProtectedPath("/signin")).toBe(false);
    expect(isProtectedPath("/signup")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
  });
});
