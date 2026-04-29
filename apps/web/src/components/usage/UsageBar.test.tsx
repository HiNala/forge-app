import { render, screen } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UsageBar } from "./UsageBar";

function renderBar(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("UsageBar", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (q: string) => ({
        matches: false,
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
        onchange: null,
      }),
    });
  });

  it("at 100% uses full-fill token + progressbar at aria max", () => {
    const { container } = renderBar(
      <UsageBar label="Credits" percentUsed={100} used={50} cap={50} />,
    );
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    const fill = container.querySelector(".h-full.rounded-full");
    expect((fill as HTMLElement).className).toMatch(/bg-usage-fill-full/);
    expect(fill?.parentElement?.getAttribute("role")).toBe("progressbar");
  });

  it("uses neutral usage fill token below 95%", () => {
    const { container } = renderBar(
      <UsageBar label="S" percentUsed={40} used={2} cap={5} />,
    );
    const fill = container.querySelector(".h-full.rounded-full");
    expect((fill as HTMLElement).className).toMatch(/bg-usage-fill/);
    expect((fill as HTMLElement).className).not.toMatch(/usage-fill-full/);
  });

  it("uses approach token at ≥95%", () => {
    const { container } = renderBar(
      <UsageBar label="S" percentUsed={95} used={19} cap={20} />,
    );
    const fill = container.querySelector(".h-full.rounded-full");
    expect((fill as HTMLElement).className).toMatch(/bg-usage-fill-approach/);
  });

  it("uses neutral fill token for 94% (below warning threshold)", () => {
    const { container } = renderBar(
      <UsageBar label="S" percentUsed={94} used={188} cap={200} />,
    );
    const fill = container.querySelector(".h-full.rounded-full") as HTMLElement | null;
    const tokens = (fill?.className ?? "").split(/\s+/).filter(Boolean);
    expect(tokens.includes("bg-usage-fill")).toBe(true);
    expect(tokens.includes("bg-usage-fill-full")).toBe(false);
    expect(tokens.includes("bg-usage-fill-approach")).toBe(false);
  });
});
