import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { debounce } from "./debounce";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for the debounce window before invoking", () => {
    const fn = vi.fn();
    const d = debounce(fn, 2000);
    d("a");
    d("b");
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("b");
  });
});
