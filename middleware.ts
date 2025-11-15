import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  console.log("[MIDDLEWARE] Request received:", {
    pathname: request.nextUrl.pathname,
    method: request.method,
    timestamp: new Date().toISOString(),
  });

  // In production (HTTPS), Better Auth uses __Secure- prefix
  const sessionToken =
    request.cookies.get("__Secure-better-auth.session_token") ||
    request.cookies.get("better-auth.session_token");
  const { pathname } = request.nextUrl;

  console.log("[MIDDLEWARE] Session check:", {
    hasSessionToken: !!sessionToken,
    sessionTokenValue: sessionToken?.value?.substring(0, 20) + "...", // Log first 20 chars only
    pathname,
    cookieName: sessionToken?.name,
  });

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/register"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  console.log("[MIDDLEWARE] Route check:", {
    pathname,
    isPublicRoute,
    publicRoutes,
  });

  // Auth API routes should always be accessible
  if (pathname.startsWith("/api/auth")) {
    console.log("[MIDDLEWARE] Auth API route - allowing access");
    return NextResponse.next();
  }

  // If user is not authenticated and trying to access protected route
  if (!sessionToken && !isPublicRoute) {
    console.log("[MIDDLEWARE] Redirecting to login - no session token and protected route");
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and trying to access login/register
  if (sessionToken && isPublicRoute) {
    console.log("[MIDDLEWARE] Redirecting to home - authenticated user on public route");
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  console.log("[MIDDLEWARE] Allowing request to proceed");
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
