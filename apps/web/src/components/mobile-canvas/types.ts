import type { MobileDeviceId } from "@/lib/mobile-devices";
import type { Node } from "@xyflow/react";

export type MobilePhoneNodeData = {
  screenId: string;
  title: string;
  /** Raw HTML for the “screen” — matches server-generated mobile shell output */
  html: string;
  deviceId: MobileDeviceId;
  theme: "light" | "dark";
};

export function createMobilePhoneNode(
  screenId: string,
  title: string,
  html: string,
  deviceId: MobileDeviceId,
  x: number,
  y: number,
): Node<MobilePhoneNodeData> {
  return {
    id: screenId,
    type: "phoneScreen",
    position: { x, y },
    data: { screenId, title, html, deviceId, theme: "light" },
  };
}
