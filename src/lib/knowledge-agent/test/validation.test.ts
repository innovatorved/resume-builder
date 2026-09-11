import { describe, expect, test } from "bun:test";
import {
  DEFAULT_INTERNAL_SECRET,
  extractListingHeadingsAndLinks,
  isDeepContentRoute,
  isPublicHttpsUrl,
  userPrefix,
  validateResumeReference,
  validateSource,
  validateSourceId,
  verifyInternalSecret,
} from "../validation";

describe("knowledge source validation", () => {
  test("rejects private and non-HTTPS URLs", () => {
    expect(() => validateSource({ type: "website", url: "http://example.com" })).toThrow();
    expect(() => validateSource({ type: "website", url: "https://127.0.0.1/a" })).toThrow();
    expect(isPublicHttpsUrl("https://[::1]/")).toBe(false);
    expect(isPublicHttpsUrl("https://user:pass@example.com/")).toBe(false);
    expect(isPublicHttpsUrl("https://example.com./public")).toBe(true);
  });
  test("restricts provider hosts and upload types", () => {
    expect(() => validateSource({ type: "github", url: "https://example.com/user" })).toThrow();
    expect(validateSource({ type: "linkedin", url: "https://www.linkedin.com/in/user" }).type).toBe("linkedin");
    expect(validateSource({ type: "portfolio", url: "https://example.com" }).type).toBe("portfolio");
    expect(() => validateSource({ type: "upload", content: "x", mimeType: "text/html" })).toThrow();
    expect(() => validateSource({ type: "upload", content: "x", mimeType: "application/pdf" })).toThrow();
  });
  test("rejects malformed optional fields and source IDs", () => {
    expect(() => validateSource({ type: "website", url: "https://example.com", name: {} })).toThrow();
    expect(() => validateSourceId("../other")).toThrow();
    expect(validateSourceId("123e4567-e89b-12d3-a456-426614174000")).toBe(
      "123e4567-e89b-12d3-a456-426614174000"
    );
  });
  test("validates resume sync payloads and size", () => {
    expect(() => validateResumeReference({ resumeId: "../other", data: {} })).toThrow();
    expect(() => validateResumeReference({ resumeId: "resume", data: "not structured" })).toThrow();
    expect(
      validateResumeReference({ resumeId: "resume", name: " Example ", data: { skills: [] } })
    ).toEqual({ resumeId: "resume", name: "Example", data: { skills: [] } });
    expect(() =>
      validateResumeReference({ resumeId: "resume", data: {}, rawLatex: "x".repeat(500_001) })
    ).toThrow();
  });
  test("creates isolated prefixes", () => expect(userPrefix("a/b")).toBe("users/a%2Fb/"));
  test("does not let encoded tenant IDs escape their prefix", () => {
    expect(userPrefix("../other")).toBe("users/..%2Fother/");
    expect(userPrefix("a").startsWith(userPrefix("ab"))).toBe(false);
  });
  test("excludes deep blog and project subpages while allowing listing index routes", () => {
    expect(isDeepContentRoute("https://vedgupta.in/blog/how-to-build-x")).toBe(true);
    expect(isDeepContentRoute("https://vedgupta.in/posts/ai-agents")).toBe(true);
    expect(isDeepContentRoute("https://vedgupta.in/projects/resume-builder")).toBe(true);
    expect(isDeepContentRoute("https://vedgupta.in/project/my-tool")).toBe(true);
    expect(isDeepContentRoute("https://vedgupta.in/blog")).toBe(false);
    expect(isDeepContentRoute("https://vedgupta.in/blog/")).toBe(false);
    expect(isDeepContentRoute("https://vedgupta.in/projects")).toBe(false);
    expect(isDeepContentRoute("https://vedgupta.in/about")).toBe(false);
    expect(isDeepContentRoute("https://vedgupta.in/experience")).toBe(false);
  });
  test("extracts article titles and reference links from listing html", () => {
    const html = `
      <article>
        <h2><a href="/blog/ai-agents">Building AI Agents</a></h2>
        <p>Comprehensive guide to autonomous systems.</p>
      </article>
    `;
    const summary = extractListingHeadingsAndLinks(html, "https://vedgupta.in");
    expect(summary).toContain("Building AI Agents");
    expect(summary).toContain("https://vedgupta.in/blog/ai-agents");
    expect(summary).toContain("Comprehensive guide");
  });
  test("authenticates internal secrets and rejects unauthorized or missing callers", () => {
    expect(verifyInternalSecret(DEFAULT_INTERNAL_SECRET)).toBe(true);
    expect(verifyInternalSecret("custom-secret", "custom-secret")).toBe(true);
    expect(verifyInternalSecret("wrong-secret", "custom-secret")).toBe(false);
    expect(verifyInternalSecret("", "custom-secret")).toBe(false);
    expect(verifyInternalSecret(null, "custom-secret")).toBe(false);
    expect(verifyInternalSecret(undefined, "custom-secret")).toBe(false);
    expect(verifyInternalSecret(undefined)).toBe(false);
  });
});
