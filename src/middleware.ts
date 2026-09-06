import { defineMiddleware } from "astro:middleware";
import { auth } from "@/lib/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_astro") ||
    pathname === "/favicon.ico";

  try {
    const session = await auth.api.getSession({
      headers: context.request.headers,
    });

    if (session) {
      context.locals.user = session.user;
      context.locals.session = session.session;
    }

    if (!session && !isPublicRoute) {
      return context.redirect("/login");
    }

    if (session && (pathname === "/login" || pathname === "/register")) {
      return context.redirect("/");
    }
  } catch (error) {
    console.error("[MIDDLEWARE] Error checking session:", error);
    if (!isPublicRoute) {
      return context.redirect("/login");
    }
  }

  return next();
});
