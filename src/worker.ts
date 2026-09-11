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
      Object.assign(process.env, env);
    }

    const url = new URL(request.url);
    if (url.pathname.startsWith("/users/")) {
      return handleKnowledgeRequest(request, env);
    }
    return handle(request, env, ctx);
  },
};
