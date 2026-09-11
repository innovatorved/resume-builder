import { db } from "@/lib/db";
import { resume } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export interface KnowledgeChunk {
  key: string;
  text: string;
  score?: number;
}

export interface UserCareerContext {
  profileMarkdown: string | null;
  sources: Array<{ id: string; type: string; name?: string; url?: string; status: string }>;
  existingResumeSummary: string | null;
}

export const DEFAULT_INTERNAL_SECRET = "rb_internal_agent_sec_2026";

// biome-ignore lint/suspicious/noExplicitAny: env bindings can come from multiple runtime contexts
export function getInternalServiceKey(locals?: any): string {
  const env = locals?.runtime?.env || process.env;
  return (
    env?.INTERNAL_SERVICE_KEY ||
    process.env.INTERNAL_SERVICE_KEY ||
    DEFAULT_INTERNAL_SECRET
  );
}

// biome-ignore lint/suspicious/noExplicitAny: env bindings can come from multiple runtime contexts
function getKnowledgeBaseUrl(locals: any): string {
  const env = locals?.runtime?.env || process.env;
  return (
    env?.KNOWLEDGE_AGENT_URL ||
    process.env.KNOWLEDGE_AGENT_URL ||
    "https://resume-builder-knowledge-agent.innovatorved.workers.dev"
  );
}

// biome-ignore lint/suspicious/noExplicitAny: env bindings can come from multiple runtime contexts
export async function callKnowledgeAgent(
  locals: any,
  userId: string,
  subPath: string,
  options: RequestInit = {}
): Promise<Response | null> {
  const service = locals?.runtime?.env?.KNOWLEDGE_AGENT;
  const cleanSubPath = subPath.replace(/^\/+/, "");
  const internalSecret = getInternalServiceKey(locals);

  const headers = new Headers(options.headers || {});
  headers.set("x-internal-secret", internalSecret);
  const optionsWithSecret: RequestInit = { ...options, headers };

  if (service) {
    try {
      const target = new URL(
        `/users/${encodeURIComponent(userId)}/${cleanSubPath}`,
        "https://knowledge-agent.internal"
      );
      return await service.fetch(new Request(target, optionsWithSecret));
    } catch (err) {
      console.warn("[knowledge-retriever] Service binding fetch warning:", err);
    }
  }

  // Fallback to public worker URL (e.g. during local dev or fallback)
  const baseUrl = getKnowledgeBaseUrl(locals);
  try {
    const target = new URL(`/users/${encodeURIComponent(userId)}/${cleanSubPath}`, baseUrl);
    return await fetch(target.toString(), optionsWithSecret);
  } catch (err) {
    console.warn("[knowledge-retriever] HTTP fallback warning:", err);
    return null;
  }
}

// biome-ignore lint/suspicious/noExplicitAny: env bindings can come from multiple runtime contexts
export async function fetchUserProfile(
  locals: any,
  userId: string
): Promise<{ profileMarkdown: string | null; sources: any[] }> {
  let profileMarkdown: string | null = null;
  let sources: any[] = [];

  try {
    const [docRes, sourcesRes] = await Promise.all([
      callKnowledgeAgent(locals, userId, "documents?path=profile.md"),
      callKnowledgeAgent(locals, userId, "sources"),
    ]);

    if (docRes && docRes.ok) {
      const data = (await docRes.json()) as { content?: string } | null;
      if (data?.content) profileMarkdown = data.content;
    }

    if (sourcesRes && sourcesRes.ok) {
      const data = (await sourcesRes.json()) as any[];
      if (Array.isArray(data)) sources = data;
    }
  } catch (err) {
    console.warn("[knowledge-retriever] fetchUserProfile error:", err);
  }

  return { profileMarkdown, sources };
}

// biome-ignore lint/suspicious/noExplicitAny: env bindings can come from multiple runtime contexts
export async function searchKnowledgeEvidence(
  locals: any,
  userId: string,
  query: string
): Promise<KnowledgeChunk[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const res = await callKnowledgeAgent(locals, userId, "query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: trimmed }),
    });

    if (res && res.ok) {
      const data = (await res.json()) as Array<{
        item?: { key?: string };
        text?: string;
        score?: number;
      }>;

      if (Array.isArray(data)) {
        return data
          .map((chunk) => ({
            key: String(chunk.item?.key || "source"),
            text: String(chunk.text || "").slice(0, 5000),
            score: typeof chunk.score === "number" ? chunk.score : undefined,
          }))
          .filter((c) => c.text.length > 0);
      }
    }
  } catch (err) {
    console.warn("[knowledge-retriever] searchKnowledgeEvidence error:", err);
  }

  return [];
}

export async function fetchUserExistingResumeContext(
  userId: string,
  excludeResumeId?: string
): Promise<string | null> {
  try {
    const existing = await db
      .select({
        id: resume.id,
        name: resume.name,
        data: resume.data,
      })
      .from(resume)
      .where(eq(resume.userId, userId))
      .orderBy(desc(resume.updatedAt))
      .limit(3);

    const filtered = existing.filter((r) => r.id !== excludeResumeId);
    if (!filtered.length) return null;

    const summaries = filtered.map((r) => {
      const parsed = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      return `### Prior Resume: ${r.name}\n\`\`\`json\n${JSON.stringify(parsed, null, 2).slice(0, 4000)}\n\`\`\``;
    });

    return summaries.join("\n\n");
  } catch (err) {
    console.warn("[knowledge-retriever] fetchUserExistingResumeContext error:", err);
    return null;
  }
}
