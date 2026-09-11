import { describe, expect, it } from "bun:test";
import { fetchUserProfile, searchKnowledgeEvidence } from "./retriever";

describe("knowledge retriever", () => {
  it("handles empty queries gracefully without making external calls", async () => {
    const results = await searchKnowledgeEvidence({}, "user-123", "   ");
    expect(results).toEqual([]);
  });

  it("handles empty or failed user profile requests gracefully", async () => {
    const mockLocals = {
      runtime: {
        env: {
          KNOWLEDGE_AGENT: {
            fetch: async () => new Response("Not found", { status: 404 }),
          },
        },
      },
    };

    const profile = await fetchUserProfile(mockLocals, "user-nonexistent");
    expect(profile.profileMarkdown).toBeNull();
    expect(profile.sources).toEqual([]);
  });

  it("successfully parses profile and sources when service responds", async () => {
    const mockProfile = "# Profile\n\n## Experience\nSoftware Engineer at TechCorp";
    const mockSources = [{ id: "src-1", type: "linkedin", status: "completed" }];

    const mockLocals = {
      runtime: {
        env: {
          KNOWLEDGE_AGENT: {
            fetch: async (req: Request) => {
              const url = req.url;
              if (url.includes("profile.md")) {
                return Response.json({ path: "profile.md", content: mockProfile });
              }
              if (url.includes("sources")) {
                return Response.json(mockSources);
              }
              return new Response("Not found", { status: 404 });
            },
          },
        },
      },
    };

    const profile = await fetchUserProfile(mockLocals, "user-456");
    expect(profile.profileMarkdown).toBe(mockProfile);
    expect(profile.sources).toEqual(mockSources);
  });

  it("attaches internal security secret header to all requests", async () => {
    let capturedHeader: string | null = null;
    const mockLocals = {
      runtime: {
        env: {
          INTERNAL_SERVICE_KEY: "custom-test-secret-key",
          KNOWLEDGE_AGENT: {
            fetch: async (req: Request) => {
              capturedHeader = req.headers.get("x-internal-secret");
              return Response.json([]);
            },
          },
        },
      },
    };

    await fetchUserProfile(mockLocals, "user-secret-test");
    expect(String(capturedHeader)).toBe("custom-test-secret-key");
  });
});
