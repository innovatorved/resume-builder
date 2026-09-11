import type { ResumeReference, SourceInput } from "./types";

export const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_RESUME_BYTES = 2 * 1024 * 1024;
const uploadTypes = new Set(["text/plain", "text/markdown"]);
const blockedHosts = new Set(["localhost", "localhost.localdomain"]);
const sourceTypes = new Set(["github", "portfolio", "website", "linkedin", "resume", "upload"]);

function optionalText(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`${field} must be text`);
  const result = value.replace(/\0/g, "").trim();
  if (result.length > maxLength) throw new Error(`${field} is too long`);
  return result || undefined;
}

export function isPublicHttpsUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    blockedHosts.has(host) ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "::1" ||
    host.startsWith("[") ||
    /^(0|127|10|192\.168|169\.254|172\.(1[6-9]|2\d|3[01]))(\.|$)/.test(host)
  ) {
    return false;
  }
  return true;
}

export function validateSource(input: unknown): SourceInput {
  if (!input || typeof input !== "object") throw new Error("Invalid source");
  const value = input as Record<string, unknown>;
  if (!sourceTypes.has(String(value.type))) throw new Error("Invalid source type");
  const type = value.type as SourceInput["type"];
  const name = optionalText(value.name, "Name", 200);
  const mimeType = optionalText(value.mimeType, "MIME type", 100);
  const content = optionalText(value.content, "Content", MAX_SOURCE_BYTES);
  const source: SourceInput = { type, name, mimeType, content };
  if (source.type === "upload" || source.type === "resume") {
    if (!source.content) throw new Error("Content is required");
    if (new TextEncoder().encode(source.content).byteLength > MAX_SOURCE_BYTES) throw new Error("Source is too large");
    if (source.mimeType && !uploadTypes.has(source.mimeType)) throw new Error("Unsupported MIME type");
    return source;
  }
  const sourceUrl = optionalText(value.url, "URL", 2_000);
  if (!sourceUrl) throw new Error("URL is required");
  if (!isPublicHttpsUrl(sourceUrl)) throw new Error("Only public HTTPS URLs are allowed");
  const url = new URL(sourceUrl);
  const host = url.hostname.toLowerCase();
  if (source.type === "github" && host !== "github.com") throw new Error("GitHub sources must use github.com");
  if (source.type === "linkedin" && host !== "linkedin.com" && !host.endsWith(".linkedin.com")) throw new Error("LinkedIn sources must use linkedin.com");
  source.url = url.toString();
  return source;
}

export function validateSourceId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f-]{36}$/.test(value)) throw new Error("Invalid source ID");
  return value;
}

export function validateResumeReference(input: unknown): ResumeReference {
  if (!input || typeof input !== "object") throw new Error("Invalid resume");
  const value = input as Record<string, unknown>;
  if (typeof value.resumeId !== "string" || !/^[a-zA-Z0-9_-]{1,200}$/.test(value.resumeId)) {
    throw new Error("Invalid resume ID");
  }
  if (!value.data || typeof value.data !== "object") throw new Error("Invalid resume data");
  const result: ResumeReference = {
    resumeId: value.resumeId,
    name: optionalText(value.name, "Name", 200) || "Resume",
    data: value.data,
    versionId: optionalText(value.versionId, "Version ID", 200),
    rawLatex: optionalText(value.rawLatex, "LaTeX", 500_000),
  };
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > MAX_RESUME_BYTES) {
    throw new Error("Resume is too large");
  }
  return result;
}

export const userPrefix = (userId: string) => `users/${encodeURIComponent(userId)}/`;

export function extractListingHeadingsAndLinks(html: string, origin: string): string {
  const items: string[] = [];
  const seen = new Set<string>();

  // 1. Match structured card/article/list items with headings and links
  const cardRegex =
    /<(?:article|li|div)[^>]*>[\s\S]*?<h[2-4][^>]*>(?:<a[^>]*href=["']([^"']+)["'][^>]*>)?([\s\S]*?)(?:<\/a>)?<\/h[2-4]>([\s\S]*?)<\/(?:article|li|div)>/gi;
  let match: RegExpExecArray | null;
  while ((match = cardRegex.exec(html)) !== null) {
    const rawHref = match[1];
    const title = match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const desc = match[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (title && !seen.has(title)) {
      seen.add(title);
      let href = "";
      if (rawHref) {
        try {
          href = new URL(rawHref, origin).href;
        } catch {
          href = rawHref;
        }
      }
      items.push(
        `- **${title}**${href ? ` ([Link](${href}))` : ""}${desc ? `: ${desc.slice(0, 160)}` : ""}`
      );
    }
  }

  // 2. Fallback: match direct heading links
  if (items.length === 0) {
    const headingLinkRegex =
      /<h[2-4][^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h[2-4]>/gi;
    while ((match = headingLinkRegex.exec(html)) !== null) {
      const rawHref = match[1];
      const title = match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (title && !seen.has(title)) {
        seen.add(title);
        let href = "";
        try {
          href = new URL(rawHref, origin).href;
        } catch {
          href = rawHref;
        }
        items.push(`- **${title}** ([Link](${href}))`);
      }
    }
  }

  // 3. Fallback: plain headings
  if (items.length === 0) {
    const plainHeadings = [...html.matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi)]
      .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
      .filter((t) => t.length > 2 && t.length < 140);
    for (const h of plainHeadings.slice(0, 25)) {
      items.push(`- ${h}`);
    }
  }

  return items.slice(0, 30).join("\n");
}

export function isDeepContentRoute(uStr: string): boolean {
  try {
    const u = new URL(uStr);
    const path = u.pathname.toLowerCase().replace(/\/+$/, "");
    // Exclude individual blog posts, articles, and individual project subpages
    if (/^\/(blog|posts?|articles?|writing|news|journal)\/.+/i.test(path)) return true;
    if (/^\/(projects?|works?|case-studies?)\/.+/i.test(path)) return true;
    return false;
  } catch {
    return false;
  }
}

export const DEFAULT_INTERNAL_SECRET = "rb_internal_agent_sec_2026";

export function verifyInternalSecret(
  provided: string | null | undefined,
  expectedSecret?: string
): boolean {
  const target = expectedSecret || DEFAULT_INTERNAL_SECRET;
  if (!provided || typeof provided !== "string") return false;
  return provided === target;
}

