import { describe, expect, it } from "vitest";
import { formatNumber, formatPlural } from "./numbers";

describe("format helpers", () => {
  it("formatNumber respects locale grouping", () => {
    expect(formatNumber(1234.5, "en-US")).toMatch(/1/);
    expect(formatNumber(1234.5, "en-US")).toContain("234");
  });

  it("formatPlural picks Intl plural categories", () => {
    expect(
      formatPlural(1, "en-US", {
        one: "{count} item",
        other: "{count} items",
      }),
    ).toBe("1 item");
    expect(
      formatPlural(3, "en-US", {
        one: "{count} item",
        other: "{count} items",
      }),
    ).toBe("3 items");
  });
});
