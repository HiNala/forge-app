import { NextResponse, type NextRequest } from "next/server";

import { PROTECTED_PREFIXES } from "@/lib/protected-routes";

function isProtectedRoute(req: NextRequest): boolean {
  const pathname = req.nextUrl.pathname;
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function middleware(req: NextRequest) {
  if (
    process.env.NODE_ENV === "development" &&
    req.nextUrl.pathname.startsWith("/dev")
  ) {
    return NextResponse.next();
  }

  if (isProtectedRoute(req) && !req.cookies.get("glidedesign_session")?.value) {
    const signin = new URL("/signin", req.url);
    signin.searchParams.set("next", `${req.nextUrl.pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(signin);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
