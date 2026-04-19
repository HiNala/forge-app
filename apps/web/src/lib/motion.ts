import type { Transition, Variants } from "framer-motion";

/** Non-celebration UI motion should stay at or below this (Mission FE-07). */
export const MOTION_MAX_DURATION_S = 0.6;

/** Spring presets — buttons = snappy, modals/panels = soft, celebrations = bouncy */
export const SPRINGS = {
  snappy: { type: "spring" as const, stiffness: 500, damping: 30 },
  soft: { type: "spring" as const, stiffness: 200, damping: 25 },
  bouncy: { type: "spring" as const, stiffness: 400, damping: 15 },
} as const;

const easeOut = [0.22, 1, 0.36, 1] as const;
const easeLegacy = [0.4, 0, 0.2, 1] as const;
const springEase = [0.34, 1.56, 0.64, 1] as const;

/** Low-level transition objects (Framer Motion `transition` prop). */
export const MOTION_TRANSITIONS = {
  fadeIn: { duration: 0.18, ease: easeOut as [number, number, number, number] },
  fadeUp: { duration: 0.24, ease: easeOut as [number, number, number, number] },
  scaleIn: { duration: 0.18, ease: easeOut as [number, number, number, number] },
  crossfade: { duration: 0.3, ease: easeLegacy as [number, number, number, number] },
} as const;

/** Alias for mission docs / external references — same as `MOTION_TRANSITIONS`. */
export const TRANSITIONS = MOTION_TRANSITIONS;

/** Shorten animations when the user prefers reduced motion. */
export function reduceTransition(transition: Transition | undefined): Transition {
  if (!transition) return { duration: 0.01 };
  if (typeof transition === "string") return { duration: 0.01 };
  return { ...transition, duration: 0.01 };
}

// —— Variants (app routes, lists, modals) —— //

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.18, ease: easeLegacy },
  },
};

/** Route shell — `showReduced` keeps opacity instant when user prefers reduced motion. */
export const fadeInReduced: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.01, ease: easeLegacy },
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: easeLegacy },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.22, ease: easeLegacy },
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 16 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.24, ease: easeLegacy },
  },
};

export const listStagger: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
};

/** Same as `listStagger` but without child delays — use with `prefers-reduced-motion`. */
export const listStaggerReducedMotion: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0, delayChildren: 0 },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: easeLegacy },
  },
};

export const successSpring: Variants = {
  hidden: { scale: 0, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "tween",
      duration: 0.42,
      ease: springEase,
    },
  },
};
