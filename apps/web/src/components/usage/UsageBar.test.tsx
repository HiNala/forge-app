import { render, screen } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UsageBar } from "./UsageBar";

function renderBar(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("UsageBar (P-04 states)", () => {
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

  it("renders limit reached at 100% with muted red full bar (role progressbar at max)", () => {
    const { container } = renderBar(
      <UsageBar label="Test" percentUsed={100} used={50} cap={50} />,
    );
    expect(screen.getByText("Limit reached")).toBeTruthy();
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    const fill = container.querySelector(".h-full.rounded-full");
    expect((fill as HTMLElement).className).toMatch(/red-500/);
  });

  it("uses teal accent fill for low consumption (0–69%)", () => {
    const { container } = renderBar(
      <UsageBar label="S" percentUsed={40} used={2} cap={5} />,
    );
    const fill = container.querySelector(".h-full.rounded-full");
    expect((fill as HTMLElement).className).toMatch(/bg-accent/);
  });

  it("uses amber for 70–89%", () => {
    const { container } = renderBar(
      <UsageBar label="S" percentUsed={80} used={4} cap={5} />,
    );
    const fill = container.querySelector(".h-full.rounded-full");
    expect((fill as HTMLElement).className).toMatch(/amber-500/);
  });

  it("uses orange for 90–99%", () => {
    const { container } = renderBar(
      <UsageBar label="S" percentUsed={95} used={19} cap={20} />,
    );
    const fill = container.querySelector(".h-full.rounded-full");
    expect((fill as HTMLElement).className).toMatch(/orange-500/);
  });
});
