import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";

export const ALL: APIRoute = async (ctx) => {
  const url = new URL(ctx.request.url);
  console.log(`[AUTH API] ${ctx.request.method} ${url.pathname}${url.search}`);
  try {
    const res = await auth.handler(ctx.request);
    const loc = res.headers.get("location");
    console.log(`[AUTH API] status=${res.status}${loc ? ` location=${loc}` : ""}`);
    return res;
  } catch (error) {
    console.error("[AUTH API ERROR]", error);
    throw error;
  }
};
