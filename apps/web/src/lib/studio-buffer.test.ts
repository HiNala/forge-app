import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createChunkBuffer } from "./studio-buffer";

describe("createChunkBuffer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("flushes accumulated chunks on the expected cadence", () => {
    const flush = vi.fn();
    const buf = createChunkBuffer(60, flush);
    buf.append("a");
    buf.append("b");
    expect(flush).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60);
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenLastCalledWith("ab");
  });

  it("flushNow flushes pending bytes immediately", () => {
    const flush = vi.fn();
    const buf = createChunkBuffer(60, flush);
    buf.append("x");
    buf.flushNow();
    expect(flush).toHaveBeenCalledWith("x");
  });
});
