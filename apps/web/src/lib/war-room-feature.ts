/**
 * BP-03 — Product War Room layout (feature flag).
 * Resolution: user preference `studio_war_room_layout` > env defaults > false.
 */

export type WarRoomFeatureContext = {
  /** From `/auth/me` user object when available */
  isPlatformAdmin?: boolean;
};

export function resolveStudioWarRoomLayout(
  prefs: Record<string, unknown> | null | undefined,
  ctx?: WarRoomFeatureContext,
): boolean {
  const raw = prefs?.studio_war_room_layout;
  if (typeof raw === "boolean") return raw;

  if (
    ctx?.isPlatformAdmin &&
    (process.env.NEXT_PUBLIC_WAR_ROOM_DOGFOOD_DEFAULT === "1" ||
      process.env.NEXT_PUBLIC_WAR_ROOM_DOGFOOD_DEFAULT === "true")
  ) {
    return true;
  }

  const def = process.env.NEXT_PUBLIC_DEFAULT_STUDIO_WAR_ROOM_LAYOUT;
  if (def === "1" || def === "true") return true;
  return false;
}
