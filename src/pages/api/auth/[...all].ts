import type { APIRoute } from "astro";
import { auth, reportAuthErrorToSso } from "@/lib/auth";

export const ALL: APIRoute = async (ctx) => {
  const url = new URL(ctx.request.url);
  console.log(`[AUTH API] ${ctx.request.method} ${url.pathname}${url.search}`);

  // Intercept any direct access to Better Auth default unstyled /api/auth/error page
  if (url.pathname === "/api/auth/error" || url.pathname.endsWith("/auth/error")) {
    const errorParam = url.searchParams.get("error") || "unknown_error";
    console.warn(`[AUTH API] Intercepted /api/auth/error?error=${errorParam}, redirecting to /auth/error`);
    await reportAuthErrorToSso({
      eventType: errorParam === "state_mismatch" ? "oauth_client_error" : "login_failed",
      error: errorParam,
      metadata: {
        pathname: url.pathname,
        search: url.search,
        userAgent: ctx.request.headers.get("user-agent") ?? undefined,
        ip: ctx.request.headers.get("cf-connecting-ip") ?? undefined,
      },
    });

    const customErrorPage = new URL("/auth/error", url.origin);
    customErrorPage.search = url.search;
    return Response.redirect(customErrorPage.toString(), 302);
  }

  try {
    const res = await auth.handler(ctx.request);
    const loc = res.headers.get("location");
    console.log(`[AUTH API] status=${res.status}${loc ? ` location=${loc}` : ""}`);

    if (loc) {
      try {
        const locUrl = new URL(loc, url.origin);
        const errorParam = locUrl.searchParams.get("error");
        if (errorParam) {
          console.error(
            `[AUTH API ERROR DETECTED] error=${errorParam} path=${url.pathname}${url.search}`
          );
          // Report error to SSO audit log
          await reportAuthErrorToSso({
            eventType: errorParam === "state_mismatch" ? "oauth_client_error" : "login_failed",
            error: errorParam,
            metadata: {
              pathname: url.pathname,
              search: url.search,
              redirectLocation: loc,
              userAgent: ctx.request.headers.get("user-agent") ?? undefined,
              ip: ctx.request.headers.get("cf-connecting-ip") ?? undefined,
            },
          });

          // Route to custom Resume Studio error page instead of Better Auth's default
          if (locUrl.pathname === "/api/auth/error") {
            const cleanRedirect = new URL("/auth/error", url.origin);
            cleanRedirect.search = locUrl.search;
            return Response.redirect(cleanRedirect.toString(), 302);
          }
        }
      } catch (err) {
        console.error("[AUTH API] Error checking redirect location:", err);
      }
    }

    return res;
  } catch (error: unknown) {
    const errObj = error instanceof Error ? error : new Error(String(error));
    console.error("[AUTH API CRITICAL ERROR]", errObj);
    await reportAuthErrorToSso({
      eventType: "oauth_client_error",
      error: errObj.message || "internal_auth_error",
      metadata: {
        pathname: url.pathname,
        search: url.search,
        stack: errObj.stack,
        userAgent: ctx.request.headers.get("user-agent") ?? undefined,
        ip: ctx.request.headers.get("cf-connecting-ip") ?? undefined,
      },
    });

    const errorRedirect = new URL("/auth/error", url.origin);
    errorRedirect.searchParams.set("error", "authentication_error");
    return Response.redirect(errorRedirect.toString(), 302);
  }
};
