/**
 * Preset viewports for mobile canvas (V2-P02) — points/density aligned with common devices.
 * Width × height in CSS pixels; safe area and notch are represented as shell style variants.
 */
export type MobileDeviceId =
  | "iphone-15"
  | "iphone-15-pro"
  | "iphone-15-pro-max"
  | "pixel-8"
  | "pixel-8-pro"
  | "ipad-mini"
  | "generic-9-19-5";

export type MobileDevicePreset = {
  id: MobileDeviceId;
  label: string;
  width: number;
  height: number;
  /** iOS / android / generic — affects home indicator, status bar */
  platform: "ios" | "android" | "generic";
  hasDynamicIsland: boolean;
  hasHomeIndicator: boolean;
  cornerRadius: number;
};

export const MOBILE_DEVICE_PRESETS: readonly MobileDevicePreset[] = [
  { id: "iphone-15", label: "iPhone 15", width: 393, height: 852, platform: "ios", hasDynamicIsland: true, hasHomeIndicator: true, cornerRadius: 48 },
  { id: "iphone-15-pro", label: "iPhone 15 Pro", width: 393, height: 852, platform: "ios", hasDynamicIsland: true, hasHomeIndicator: true, cornerRadius: 48 },
  { id: "iphone-15-pro-max", label: "iPhone 15 Pro Max", width: 430, height: 932, platform: "ios", hasDynamicIsland: true, hasHomeIndicator: true, cornerRadius: 52 },
  { id: "pixel-8", label: "Pixel 8", width: 412, height: 915, platform: "android", hasDynamicIsland: false, hasHomeIndicator: false, cornerRadius: 40 },
  { id: "pixel-8-pro", label: "Pixel 8 Pro", width: 412, height: 915, platform: "android", hasDynamicIsland: false, hasHomeIndicator: false, cornerRadius: 40 },
  { id: "ipad-mini", label: "iPad Mini (portrait)", width: 744, height: 1133, platform: "ios", hasDynamicIsland: false, hasHomeIndicator: true, cornerRadius: 32 },
  { id: "generic-9-19-5", label: "9:19.5", width: 360, height: 780, platform: "generic", hasDynamicIsland: false, hasHomeIndicator: false, cornerRadius: 32 },
] as const;

export function getDevicePreset(id: MobileDeviceId): MobileDevicePreset {
  return MOBILE_DEVICE_PRESETS.find((d) => d.id === id) ?? MOBILE_DEVICE_PRESETS[0]!;
}
