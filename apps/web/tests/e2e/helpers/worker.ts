/**
 * Best-effort wait for arq / Redis queue to drain (GL-03 hook for automation-heavy flows).
 * Extend with Redis LLEN or worker metrics when exposed. ``maxWaitMs`` is accepted for
 * forward-compat: swap the fixed sleep with a polling loop once worker metrics are exposed.
 */
export async function flushQueue(maxWaitMs = 30_000): Promise<void> {
  if (process.env.PLAYWRIGHT_SKIP_QUEUE_DRAIN === "1") {
    return;
  }
  const delay = Math.min(250, Math.max(0, maxWaitMs));
  await new Promise((r) => setTimeout(r, delay));
}
