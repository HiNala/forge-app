/**
 * Route prefixes that require a signed-in GlideDesign session (see `src/middleware.ts`).
 * Kept in one place for tests and docs.
 */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/studio",
  "/pages",
  "/analytics",
  "/templates",
  "/admin",
  "/settings",
  "/automations",
  "/submissions",
  "/oauth",
] as const;

export function isProtectedPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}
