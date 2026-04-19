/**
 * Buffered append for SSE HTML chunks — flush at a fixed cadence to limit layout thrash.
 */

export type ChunkBuffer = {
  append: (chunk: string) => void;
  /** Flush any pending bytes synchronously. */
  flushNow: () => void;
  reset: () => void;
};

export function createChunkBuffer(flushEveryMs: number, onFlush: (accumulated: string) => void): ChunkBuffer {
  let accumulated = "";
  let pending = "";
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending) return;
    accumulated += pending;
    pending = "";
    onFlush(accumulated);
  }

  function schedule() {
    if (timer != null) return;
    timer = setTimeout(() => {
      timer = null;
      flush();
    }, flushEveryMs);
  }

  return {
    append(chunk: string) {
      if (!chunk) return;
      pending += chunk;
      schedule();
    },
    flushNow() {
      flush();
    },
    reset() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      accumulated = "";
      pending = "";
    },
  };
}
