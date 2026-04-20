/**
 * Route prefixes that require a signed-in Clerk session (see `src/middleware.ts`).
 * Mission 02 refers to the “app shell” as `/app/*`; in the Next.js App Router we use
 * a `(app)` route group so URLs stay `/dashboard`, `/settings`, etc. (no `/app` segment).
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
  "/notifications",
  "/oauth",
] as const;

export function isProtectedPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}
