import { describe, expect, it } from "vitest";
import { formatCurrency } from "./currency";

describe("formatCurrency", () => {
  it("formats USD in en-US", () => {
    expect(formatCurrency(1999, "usd", "en-US")).toMatch(/\$19\.99/);
  });

  it("formats EUR de-DE like German locale grouping", () => {
    expect(formatCurrency(2099, "eur", "de-DE")).toMatch(/20/);
    expect(formatCurrency(2099, "eur", "de-DE")).toMatch(/99/);
  });

  it("formats JPY without throwing", () => {
    expect(() => formatCurrency(999_00, "JPY", "ja-JP")).not.toThrow();
  });
});
