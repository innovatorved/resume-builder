// Helper to retrieve Cloudflare Worker environment and bindings safely
// across Cloudflare Workers (workerd runtime), Astro SSR, and unit test environments.

// biome-ignore lint/suspicious/noExplicitAny: bindings can come from multiple runtime contexts
function createKnowledgeFetcher(env: Record<string, any>): Fetcher {
  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(input, init);
      const { handleKnowledgeRequest } = await import("./knowledge-agent");
      return handleKnowledgeRequest(req, env as any);
    },
  } as Fetcher;
}

// biome-ignore lint/suspicious/noExplicitAny: bindings can come from multiple runtime contexts
export async function getCloudflareEnv(locals?: any): Promise<Record<string, any>> {
  let envObj: Record<string, any> | undefined;

  if (locals && typeof locals === "object") {
    if (locals.env) envObj = locals.env;
    else {
      try {
        if (locals.runtime?.env) envObj = locals.runtime.env;
      } catch {
        // In Astro v6+, accessing locals.runtime throws - ignore and fall through
      }
    }
  }

  if (!envObj) {
    try {
      const mod = await import("cloudflare:workers");
      if (mod?.env) envObj = mod.env;
    } catch {
      // Not running inside workerd runtime (e.g. Bun test runner or Node)
    }
  }

  const result = envObj || (process.env || {}) as Record<string, any>;
  if (result.KnowledgeAgent && !result.KNOWLEDGE_AGENT) {
    result.KNOWLEDGE_AGENT = createKnowledgeFetcher(result);
  }
  return result;
}

// biome-ignore lint/suspicious/noExplicitAny: bindings can come from multiple runtime contexts
export function getSyncCloudflareEnv(locals?: any): Record<string, any> {
  let envObj: Record<string, any> | undefined;

  if (locals && typeof locals === "object") {
    if (locals.env) envObj = locals.env;
    else {
      try {
        if (locals.runtime?.env) envObj = locals.runtime.env;
      } catch {
        // In Astro v6+, accessing locals.runtime throws - ignore and fall through
      }
    }
  }

  const result = envObj || (process.env || {}) as Record<string, any>;
  if (result.KnowledgeAgent && !result.KNOWLEDGE_AGENT) {
    result.KNOWLEDGE_AGENT = createKnowledgeFetcher(result);
  }
  return result;
}
