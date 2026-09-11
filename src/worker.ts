import { handle } from "@astrojs/cloudflare/handler";
import {
  KnowledgeAgent,
  KnowledgeIngestionWorkflow,
  handleKnowledgeRequest,
} from "./lib/knowledge-agent";
import type { Env } from "./lib/knowledge-agent/types";

export { KnowledgeAgent, KnowledgeIngestionWorkflow };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (env && typeof env === "object") {
      for (const [key, value] of Object.entries(env)) {
        if (value !== undefined && value !== "") {
          process.env[key] = value as string;
        }
      }
      if ((env as any).SSO_SERVICE) {
        (globalThis as any).__SSO_SERVICE__ = (env as any).SSO_SERVICE;
      }
    }

    const url = new URL(request.url);
    if (url.pathname.startsWith("/users/")) {
      return handleKnowledgeRequest(request, env);
    }
    return handle(request, env, ctx);
  },
};
