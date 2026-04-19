"use client";

/**
 * First-publish celebration: small pastel burst, respects prefers-reduced-motion.
 * Uses design tokens via canvas-confetti colors (approximate OKLCH accents as hex via CSS vars at runtime is heavy; use soft pastels).
 */
export async function fireFirstPublishConfetti(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const confetti = (await import("canvas-confetti")).default;

  const count = 18;
  const defaults = {
    origin: { y: 0.65, x: 0.5 },
    zIndex: 9999,
    ticks: 120,
    gravity: 0.9,
    scalar: 0.75,
  };

  const colors = [
    "#e8d5f2",
    "#d4e8f5",
    "#fde2d4",
    "#e5f0e8",
    "#f5ead8",
    "#e0e8fd",
  ];

  confetti({
    ...defaults,
    particleCount: count,
    spread: 70,
    startVelocity: 32,
    colors,
  });

  window.setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: Math.floor(count * 0.5),
      spread: 100,
      startVelocity: 22,
      colors,
    });
  }, 180);
}
