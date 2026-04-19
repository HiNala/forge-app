import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChartEmpty } from "./analytics-shared";

describe("ChartEmpty", () => {
  it("shows the empty-range copy (Mission FE-06 — zero events)", () => {
    render(<ChartEmpty message="No events in the last 7 days. Share your page to start seeing data." />);
    expect(
      screen.getByText(/No events in the last 7 days/i),
    ).toBeTruthy();
  });
});
