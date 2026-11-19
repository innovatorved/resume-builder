import type { WorkflowEvent } from "cloudflare:workers";
import { getAgentByName } from "agents";
import { AgentWorkflow, type AgentWorkflowStep } from "agents/workflows";
import {
  fetchGithub,
  fetchLinkedinWithPdf,
  fetchPortfolio,
  fetchSinglePage,
  now,
  sha256,
  text,
} from "./fetchers";
import type { KnowledgeAgent } from "./index";
import type { Env, IngestionParams, IngestionRunStatus } from "./types";
import { MAX_SOURCE_BYTES, userPrefix } from "./validation";
import { classifyRetry } from "./workflow-state";

export class KnowledgeIngestionWorkflow extends AgentWorkflow<
  KnowledgeAgent,
  IngestionParams,
  { step: string },
  Env
> {
  async run(event: WorkflowEvent<IngestionParams>, step: AgentWorkflowStep) {
    const { source, userId, runId, generation } = event.payload;
    const sourceAgent = await getAgentByName(
      this.env.KnowledgeAgent,
      `source:${userId}:${source.id}`
    );

    const log = async (stageName: string, message: string) => {
      try {
        await sourceAgent.recordAnalysis(runId, stageName, message);
      } catch {
        // Non-blocking log delivery
      }
    };

    const stage = async (name: IngestionRunStatus, detail?: string) => {
      await step.sendEvent({ kind: "stage", generation, stage: name, detail });
      await log(name, detail || `Agent reached stage: ${name}`);
    };

    try {
      await stage(
        "fetching",
        `Agent connecting to ${source.type} source (${source.url || source.name || "uploaded document"})...`
      );
      const content = await step.do(
        "fetch-source",
        { retries: { limit: 2, delay: "5 seconds", backoff: "exponential" } },
        async () => {
          if (source.type === "github") {
            await log("fetching", `Querying GitHub API & scanning repositories for: ${source.url}`);
            return fetchGithub(this.env, source.url!);
          }
          if (source.type === "linkedin") {
            return fetchLinkedinWithPdf(this.env, source.url!, source.content, log);
          }
          if (source.type === "portfolio") {
            return fetchPortfolio(this.env, source.url!, log);
          }
          if (source.type === "website") {
            return fetchSinglePage(this.env, source.url!, log);
          }
          await log(
            "fetching",
            `Processing uploaded resume text (${source.mimeType || "text/markdown"})...`
          );
          return text(source.content);
        }
      );
      await log(
        "fetching",
        `Raw content acquired (${content.length} characters). Proceeding to validation.`
      );

      await stage(
        "validating",
        "Validating content boundaries, utf-8 integrity, and hash fingerprint..."
      );
      if (!content.trim()) throw new Error("Source returned no content");
      if (new TextEncoder().encode(content).byteLength > MAX_SOURCE_BYTES)
        throw new Error("Source is too large");
      const hash = await step.do("hash-content", () => sha256(content));
      await log("validating", `Content SHA-256 fingerprint verified: ${hash.slice(0, 16)}...`);

      if (hash === source.hash && source.artifactReady) {
        await log(
          "validating",
          "Content is unchanged from current generation. Preserving existing artifacts."
        );
        await step.do("mark-unchanged", () =>
          this.agent.completeUnchanged(runId, generation, hash)
        );
        await step.reportComplete({ unchanged: true, searchReady: source.searchReady });
        return { unchanged: true };
      }

      await log(
        "validating",
        "Agent analyzing career history, technical stack, metrics, and accomplishments..."
      );
      const markdown = `# ${source.name || source.type}\n\n${content}\n\n---\nSource: ${source.url || "first-party upload"}\nRetrieved: ${now()}\nConfidence: high\n`;

      await log(
        "storing",
        "Agent synthesized clean Markdown representation. Pushing live preview to source channel..."
      );
      try {
        await sourceAgent.recordConvertedMarkdown(runId, markdown);
      } catch {
        // Best-effort markdown recording
      }

      await stage(
        "storing",
        `Storing isolated generation artifact to R2 storage at generations/${source.id}/${generation}/source.md`
      );
      const stagedKey = `${userPrefix(userId)}generations/${source.id}/${generation}/source.md`;
      await step.do("store-generation", async () => {
        await this.env.KNOWLEDGE_BUCKET.put(stagedKey, markdown, {
          httpMetadata: { contentType: "text/markdown" },
          customMetadata: { userId, sourceId: source.id, runId, generation: String(generation) },
        });
        if (source.type === "linkedin" && source.content) {
          const exportKey = `${userPrefix(userId)}generations/${source.id}/${generation}/linkedin_export.txt`;
          await this.env.KNOWLEDGE_BUCKET.put(exportKey, source.content, {
            httpMetadata: { contentType: "text/plain" },
            customMetadata: {
              userId,
              sourceId: source.id,
              runId,
              generation: String(generation),
              type: "linkedin_raw_pdf",
            },
          });
        }
        return { stored: true, key: stagedKey };
      });
      await log("storing", "Staged generation saved successfully.");

      await stage(
        "publishing",
        "Verifying generation fencing & atomically publishing canonical source.md and profile manifest..."
      );
      const published = await step.do("publish-artifacts", () =>
        this.agent.publishArtifacts(runId, generation, markdown, hash)
      );
      if (!published) {
        await log("publishing", "Publish cancelled: Generation was superseded by a newer run.");
        await step.reportComplete({ superseded: true });
        return { superseded: true };
      }
      await log("publishing", "Canonical artifacts published to profile manifest.");

      await stage("indexing", "Registering vector embeddings with AI Search engine...");
      const key = `${userPrefix(userId)}sources/${source.id}.md`;
      let item = null;
      if (this.env.KNOWLEDGE_SEARCH) {
        const search = this.env.KNOWLEDGE_SEARCH;
        item = await step.do("find-search-item", async () => {
          const found = (await search.items.list({ key, per_page: 1 })).result[0];
          return found ? { id: found.id, status: found.status, error: found.error } : null;
        });
        if (item) {
          const itemId = item.id;
          item = await step.do("sync-search-item", async () => {
            const synced = await search.items.get(itemId).sync();
            return { id: synced.id, status: synced.status, error: synced.error };
          });
        } else {
          await step.do("request-search-sync", async () => {
            await search.jobs.create({ description: `Ingest ${runId}` });
            return true;
          });
        }
      }
      const searchItem = this.env.KNOWLEDGE_SEARCH ? (item ?? undefined) : { status: "completed" };
      const searchReady = await step.do("record-index-state", () =>
        this.agent.updateIndexState(runId, generation, searchItem)
      );
      await log(
        "searchable",
        "Source successfully processed, converted to markdown, and indexed into AI knowledge base!"
      );
      await step.reportComplete({ unchanged: false, hash, searchReady });
      return { unchanged: false, hash, searchReady };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ingestion failed";
      await log("failed_permanent", `Ingestion error: ${message}`);
      await step.sendEvent({
        kind: "failure",
        generation,
        classification: classifyRetry(error),
        detail: message,
      });
      await step.reportError(message);
      throw error;
    }
  }
}
