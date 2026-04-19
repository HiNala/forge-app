import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { PROTECTED_PREFIXES } from "@/lib/protected-routes";

const isProtectedRoute = createRouteMatcher(
  PROTECTED_PREFIXES.map((p) => `${p}(.*)`),
);

export default clerkMiddleware(async (auth, req) => {
  if (
    process.env.NODE_ENV === "development" &&
    req.nextUrl.pathname.startsWith("/dev")
  ) {
    return;
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
