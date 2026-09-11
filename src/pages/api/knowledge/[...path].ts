import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { getCloudflareEnv } from "@/lib/cloudflare-env";

const handler: APIRoute = async ({ request, locals, params, url }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const env = await getCloudflareEnv(locals);
  const service = env.KNOWLEDGE_AGENT;
  if (!service)
    return Response.json({ error: "Knowledge service is not configured" }, { status: 503 });
  const path = String(params.path || "status").replace(/^\/+/, "");
  if (!/^[a-zA-Z0-9_./-]{1,500}$/.test(path) || path.split("/").includes("..")) {
    return Response.json({ error: "Invalid path" }, { status: 400 });
  }
  const target = new URL(
    `/users/${encodeURIComponent(session.user.id)}/${path}`,
    "https://knowledge-agent.internal"
  );
  target.search = url.search;

  const internalSecret =
    env.INTERNAL_SERVICE_KEY || process.env.INTERNAL_SERVICE_KEY || "rb_internal_agent_sec_2026";

  if (request.headers.get("Upgrade") === "websocket" || path === "ws" || path.endsWith("/ws")) {
    const wsHeaders = new Headers(request.headers);
    wsHeaders.set("x-internal-secret", internalSecret);
    return service.fetch(new Request(target, { method: request.method, headers: wsHeaders }));
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (!Number.isFinite(contentLength) || contentLength > 6 * 1024 * 1024) {
    return Response.json({ error: "Request body is too large" }, { status: 413 });
  }
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const idempotencyKey = request.headers.get("x-idempotency-key");
  if (idempotencyKey) headers.set("x-idempotency-key", idempotencyKey);
  headers.set("x-internal-secret", internalSecret);
  return service.fetch(
    new Request(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    })
  );
};

export const ALL = handler;
