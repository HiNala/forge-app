/**
 * Route prefixes that require a signed-in Clerk session (see `src/middleware.ts`).
 * Kept in one place for tests and docs.
 */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/studio",
  "/pages",
  "/analytics",
  "/templates",
  "/settings",
  "/automations",
  "/submissions",
] as const;

export function isProtectedPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}
