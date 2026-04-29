/**
 * Static GlideDesign color values for places that cannot rely on inherited CSS variables:
 * OG ImageResponse routes, SSR-only error UI, inlined iframe previews, and canvas chrome.
 * Values mirror `tokens.css` so audits have one palette instead of per-surface drift.
 */
export const forgeStaticColors = {
  bone: "oklch(1 0 0)",
  sandWarm: "oklch(0.98 0.005 280)",
  graphiteInk: "oklch(0.13 0.02 280)",
  slateCaption: "oklch(0.50 0.008 280)",
  mistSecondary: "oklch(0.72 0.005 280)",
  brandViolet: "oklch(0.55 0.21 285)",
  brandCoral: "oklch(0.70 0.20 25)",
  copperAccent: "oklch(0.55 0.21 285)",
  copperStrong: "oklch(0.44 0.21 285)",
  emeraldData: "oklch(0.84 0.10 165)",
  white: "oklch(1 0 0)",
  onAccent: "oklch(1 0 0)",
  previewMuted: "oklch(0.50 0.008 280)",

  /** Web canvas device frame - light simulation */
  deviceLightChromeBg: "oklch(0.97 0.005 280)",
  deviceLightFg: "oklch(0.13 0.02 280)",
  deviceLightElevated: "oklch(0.98 0.005 280)",

  /** Web canvas - dark simulation */
  deviceDarkChromeBg: "oklch(0.10 0.01 280)",
  deviceDarkFg: "oklch(0.86 0.005 280)",
  deviceDarkElevated: "oklch(0.17 0.013 280)",

  /** Static export previews when accent is not supplied */
  defaultAccent: "oklch(0.55 0.21 285)",

  /** Token swatch panel when CSS var is unavailable */
  swatchFallback: "oklch(0.84 0.008 280)",

  mobileShellLight: "oklch(0.97 0.005 280)",
  phoneBezelDark: "oklch(0.08 0.008 280)",
  mobileScreenLight: "oklch(1 0 0)",
  mobileScreenDark: "oklch(0.10 0.01 280)",
  dynamicIslandDark: "oklch(0.06 0.008 280)",
  dynamicIslandLight: "oklch(0.13 0.02 280)",
} as const;

export const forgeFallbackHex = forgeStaticColors;
