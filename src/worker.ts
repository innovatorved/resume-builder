import { handle } from "@astrojs/cloudflare/handler";
import { KnowledgeAgent, KnowledgeIngestionWorkflow } from "./lib/knowledge-agent";
import type { Env } from "./lib/knowledge-agent/types";

export { KnowledgeAgent, KnowledgeIngestionWorkflow };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (env && typeof env === "object") {
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === "string" && value !== "") {
          process.env[key] = value;
        }
      }
      if ((env as unknown as Record<string, unknown>).SSO_SERVICE) {
        (globalThis as unknown as Record<string, unknown>).__SSO_SERVICE__ = (
          env as unknown as Record<string, unknown>
        ).SSO_SERVICE;
      }
    }

    return handle(request, env, ctx);
  },
};
