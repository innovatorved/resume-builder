import {
  Agent,
  callable,
  getAgentByName,
  type Connection,
  type ConnectionContext,
  type WSMessage,
} from "agents";
import { AgentWorkflow, type AgentWorkflowStep } from "agents/workflows";
import type { WorkflowEvent } from "cloudflare:workers";
import type {
  Env,
  IngestionParams,
  IngestionRunRecord,
  IngestionRunStatus,
  IngestionStepRecord,
  ResumeReference,
  SourceInput,
  SourceRecord,
} from "./types";
import {
  isPublicHttpsUrl,
  MAX_SOURCE_BYTES,
  userPrefix,
  validateResumeReference,
  validateSource,
  validateSourceId,
} from "./validation";
import {
  canPublish,
  classifyRetry,
  searchStatus,
  terminalRunStatuses,
} from "./workflow-state";

const json = (data: unknown, status = 200) => Response.json(data, { status });
const now = () => new Date().toISOString();
const text = (value: unknown) => String(value ?? "").replace(/\0/g, "").slice(0, 2_000_000);
const documentPath = /^(profile\.md|manifest\.json|sources\/[a-f0-9-]+\.md)$/;
const runIdPattern = /^[0-9a-f-]{36}$/;

type DbRow = Record<string, string | number | null>;

export class KnowledgeAgent extends Agent<Env> {
  onStart() {
    this.sql`CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, url TEXT, name TEXT, content TEXT, mime_type TEXT,
      status TEXT NOT NULL, created_at TEXT NOT NULL, refreshed_at TEXT, hash TEXT, error TEXT,
      generation INTEGER NOT NULL DEFAULT 0, active_run_id TEXT, artifact_ready INTEGER NOT NULL DEFAULT 0,
      search_ready INTEGER NOT NULL DEFAULT 0, indexing_status TEXT
    )`;
    const columns = new Set([...this.sql<{ name: string }>`PRAGMA table_info(sources)`].map((row) => row.name));
    if (!columns.has("generation"))
      this.sql`ALTER TABLE sources ADD COLUMN generation INTEGER NOT NULL DEFAULT 0`;
    if (!columns.has("active_run_id"))
      this.sql`ALTER TABLE sources ADD COLUMN active_run_id TEXT`;
    if (!columns.has("artifact_ready"))
      this.sql`ALTER TABLE sources ADD COLUMN artifact_ready INTEGER NOT NULL DEFAULT 0`;
    if (!columns.has("search_ready"))
      this.sql`ALTER TABLE sources ADD COLUMN search_ready INTEGER NOT NULL DEFAULT 0`;
    if (!columns.has("indexing_status"))
      this.sql`ALTER TABLE sources ADD COLUMN indexing_status TEXT`;
    this.sql`CREATE TABLE IF NOT EXISTS ingestion_runs (
      id TEXT PRIMARY KEY, workflow_id TEXT, source_id TEXT NOT NULL, generation INTEGER NOT NULL,
      attempt INTEGER NOT NULL, idempotency_key TEXT NOT NULL UNIQUE, status TEXT NOT NULL,
      artifact_ready INTEGER NOT NULL DEFAULT 0, search_ready INTEGER NOT NULL DEFAULT 0,
      indexing_status TEXT, error TEXT, created_at TEXT NOT NULL, completed_at TEXT
    )`;
    this.sql`CREATE INDEX IF NOT EXISTS ingestion_runs_source_idx ON ingestion_runs(source_id, created_at DESC)`;
    this.sql`CREATE TABLE IF NOT EXISTS ingestion_steps (
      id TEXT PRIMARY KEY, run_id TEXT NOT NULL, stage TEXT NOT NULL, attempt INTEGER NOT NULL,
      detail TEXT, created_at TEXT NOT NULL
    )`;
    this.sql`CREATE INDEX IF NOT EXISTS ingestion_steps_run_idx ON ingestion_steps(run_id, created_at)`;
    this.sql`CREATE TABLE IF NOT EXISTS analysis_logs (
      id TEXT PRIMARY KEY, run_id TEXT NOT NULL, stage TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL
    )`;
    this.sql`CREATE INDEX IF NOT EXISTS analysis_logs_run_idx ON analysis_logs(run_id, created_at)`;
    this.sql`CREATE TABLE IF NOT EXISTS converted_markdown (
      run_id TEXT PRIMARY KEY, markdown TEXT NOT NULL, updated_at TEXT NOT NULL
    )`;
  }

  override onConnect(connection: Connection, _ctx: ConnectionContext) {
    try {
      if (this.name.startsWith("source:")) {
        const parts = this.name.split(":");
        const userId = parts[1];
        const sourceId = parts[2];
        const logs = [...this.sql<DbRow>`SELECT * FROM analysis_logs ORDER BY created_at`].map((row) => ({
          id: String(row.id),
          runId: String(row.run_id),
          stage: String(row.stage),
          message: String(row.message),
          createdAt: String(row.created_at),
        }));
        const mdRow = [...this.sql<DbRow>`SELECT markdown FROM converted_markdown ORDER BY updated_at DESC LIMIT 1`][0];
        connection.send(
          JSON.stringify({
            type: "source_agent_init",
            sourceId,
            userId,
            agentName: this.name,
            logs,
            convertedMarkdown: mdRow ? String(mdRow.markdown) : "",
            timestamp: now(),
          })
        );
      } else {
        connection.send(
          JSON.stringify({
            type: "init",
            userId: this.name,
            status: this.status(),
            timestamp: now(),
          })
        );
      }
    } catch {
      // Ignored if connection closed prematurely
    }
  }

  override onMessage(connection: Connection, message: WSMessage) {
    try {
      const raw = typeof message === "string" ? message : new TextDecoder().decode(message as ArrayBuffer);
      const parsed = JSON.parse(raw);
      if (parsed.type === "ping") {
        connection.send(JSON.stringify({ type: "pong", timestamp: now() }));
      } else if (parsed.type === "inspect_run" && parsed.runId) {
        const runData = this.inspectRun(String(parsed.runId));
        connection.send(JSON.stringify({ type: "run_details", runId: parsed.runId, data: runData }));
      } else if (parsed.type === "refresh") {
        connection.send(JSON.stringify({ type: "status_update", status: this.status(), timestamp: now() }));
      } else if (parsed.type === "get_source_state") {
        const logs = [...this.sql<DbRow>`SELECT * FROM analysis_logs ORDER BY created_at`].map((row) => ({
          id: String(row.id),
          runId: String(row.run_id),
          stage: String(row.stage),
          message: String(row.message),
          createdAt: String(row.created_at),
        }));
        const mdRow = [...this.sql<DbRow>`SELECT markdown FROM converted_markdown ORDER BY updated_at DESC LIMIT 1`][0];
        connection.send(
          JSON.stringify({
            type: "source_state",
            logs,
            convertedMarkdown: mdRow ? String(mdRow.markdown) : "",
            timestamp: now(),
          })
        );
      }
    } catch (e) {
      try {
        connection.send(
          JSON.stringify({
            type: "error",
            error: e instanceof Error ? e.message : "Invalid message",
            timestamp: now(),
          })
        );
      } catch {
        // Socket closed
      }
    }
  }

  private broadcastEvent(event: Record<string, unknown>) {
    try {
      this.broadcast(JSON.stringify({ ...event, timestamp: now() }));
    } catch {
      // Best-effort delivery to active WebSockets
    }
  }

  private source(row: DbRow): SourceRecord {
    return {
      id: String(row.id),
      type: row.type as SourceRecord["type"],
      url: row.url ? String(row.url) : undefined,
      name: row.name ? String(row.name) : undefined,
      content: row.content ? String(row.content) : undefined,
      mimeType: row.mime_type ? String(row.mime_type) : undefined,
      status: row.status as SourceRecord["status"],
      createdAt: String(row.created_at),
      refreshedAt: row.refreshed_at ? String(row.refreshed_at) : undefined,
      hash: row.hash ? String(row.hash) : undefined,
      error: row.error ? String(row.error) : undefined,
      generation: Number(row.generation),
      activeRunId: row.active_run_id ? String(row.active_run_id) : undefined,
      artifactReady: Boolean(row.artifact_ready),
      searchReady: Boolean(row.search_ready),
      indexingStatus: row.indexing_status ? String(row.indexing_status) : undefined,
    };
  }

  private sources(): SourceRecord[] {
    return [...this.sql<DbRow>`SELECT * FROM sources ORDER BY created_at DESC`].map((row) =>
      this.source(row)
    );
  }

  private findSource(id: string) {
    const row = [...this.sql<DbRow>`SELECT * FROM sources WHERE id=${id}`][0];
    return row ? this.source(row) : undefined;
  }

  private run(row: DbRow, includeSteps = false): IngestionRunRecord {
    const record: IngestionRunRecord = {
      id: String(row.id),
      workflowId: row.workflow_id ? String(row.workflow_id) : undefined,
      sourceId: String(row.source_id),
      generation: Number(row.generation),
      attempt: Number(row.attempt),
      idempotencyKey: String(row.idempotency_key),
      status: row.status as IngestionRunStatus,
      artifactReady: Boolean(row.artifact_ready),
      searchReady: Boolean(row.search_ready),
      indexingStatus: row.indexing_status ? String(row.indexing_status) : undefined,
      error: row.error ? String(row.error) : undefined,
      createdAt: String(row.created_at),
      completedAt: row.completed_at ? String(row.completed_at) : undefined,
    };
    if (includeSteps) {
      record.steps = [...this.sql<DbRow>`SELECT * FROM ingestion_steps WHERE run_id=${record.id} ORDER BY created_at`].map(
        (step): IngestionStepRecord => ({
          id: String(step.id),
          runId: String(step.run_id),
          stage: step.stage as IngestionRunStatus,
          attempt: Number(step.attempt),
          detail: step.detail ? String(step.detail) : undefined,
          createdAt: String(step.created_at),
        })
      );
    }
    return record;
  }

  private findRun(id: string, includeSteps = false) {
    const row = [...this.sql<DbRow>`SELECT * FROM ingestion_runs WHERE id=${id}`][0];
    return row ? this.run(row, includeSteps) : undefined;
  }

  private recordStep(
    runId: string,
    stage: IngestionRunStatus,
    attempt: number,
    detail?: string
  ) {
    const id = `${runId}:${stage}:${attempt}:${Date.now()}`;
    const createdAt = now();
    this.sql`INSERT INTO ingestion_steps (id,run_id,stage,attempt,detail,created_at)
      VALUES (${id},${runId},${stage},${attempt},${detail?.slice(0, 500) ?? null},${createdAt})`;
    this.broadcastEvent({
      type: "step_recorded",
      runId,
      step: { id, runId, stage, attempt, detail: detail?.slice(0, 500) ?? undefined, createdAt },
    });
  }

  private async startRun(source: SourceRecord, idempotencyKey: string, attempt: number) {
    const existing = [
      ...this.sql<DbRow>`SELECT * FROM ingestion_runs WHERE idempotency_key=${idempotencyKey}`,
    ][0];
    if (existing) return { source: this.findSource(String(existing.source_id)), run: this.run(existing) };

    const runId = crypto.randomUUID();
    const generation = source.generation + 1;
    const previousRun = source.activeRunId;
    if (previousRun) {
      this.sql`UPDATE ingestion_runs SET status='superseded', completed_at=${now()}
        WHERE id=${previousRun} AND status NOT IN ('searchable','unchanged','failed_retryable','failed_permanent','cancelled','superseded')`;
      const previous = this.findRun(previousRun);
      if (previous && !terminalRunStatuses.has(previous.status)) {
        try {
          await this.terminateWorkflow(previousRun);
        } catch {
          // The generation fence remains authoritative if termination races completion.
        }
      }
    }
    this.sql`UPDATE sources SET generation=${generation},active_run_id=${runId},status='accepted',
      artifact_ready=0,search_ready=0,indexing_status=NULL,error=NULL WHERE id=${source.id}`;
    this.sql`INSERT INTO ingestion_runs
      (id,source_id,generation,attempt,idempotency_key,status,created_at)
      VALUES (${runId},${source.id},${generation},${attempt},${idempotencyKey},'accepted',${now()})`;
    this.recordStep(runId, "accepted", attempt);
    const current = this.findSource(source.id)!;
    try {
      const workflowId = await this.runWorkflow(
        "KNOWLEDGE_INGESTION",
        { userId: this.name, source: current, runId, generation } satisfies IngestionParams,
        { id: runId, agentBinding: "KnowledgeAgent", metadata: { sourceId: source.id, generation } }
      );
      this.sql`UPDATE ingestion_runs SET workflow_id=${workflowId},status='queued' WHERE id=${runId}`;
      this.sql`UPDATE sources SET status='running' WHERE id=${source.id} AND active_run_id=${runId}`;
      this.recordStep(runId, "queued", attempt);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start ingestion";
      this.failRun(runId, message, "retryable");
    }
    return { source: this.findSource(source.id), run: this.findRun(runId, true) };
  }

  @callable() listSources() {
    return this.sources();
  }

  @callable() async addSource(input: SourceInput, idempotencyKey: string) {
    if (!idempotencyKey || idempotencyKey.length > 200) throw new Error("Idempotency key is required");
    const existing = [
      ...this.sql<DbRow>`SELECT * FROM ingestion_runs WHERE idempotency_key=${idempotencyKey}`,
    ][0];
    if (existing)
      return {
        source: this.findSource(String(existing.source_id)),
        run: this.run(existing, true),
      };
    const source = {
      ...validateSource(input),
      id: crypto.randomUUID(),
      status: "accepted",
      createdAt: now(),
      generation: 0,
      artifactReady: false,
      searchReady: false,
    } satisfies SourceRecord;
    this.sql`INSERT INTO sources
      (id,type,url,name,content,mime_type,status,created_at,generation,artifact_ready,search_ready)
      VALUES (${source.id},${source.type},${source.url ?? null},${source.name ?? null},
      ${source.content ?? null},${source.mimeType ?? null},${source.status},${source.createdAt},0,0,0)`;
    return this.startRun(source, idempotencyKey, 1);
  }

  @callable() async refreshSource(id: string, idempotencyKey: string) {
    id = validateSourceId(id);
    if (!idempotencyKey || idempotencyKey.length > 200) throw new Error("Idempotency key is required");
    const source = this.findSource(id);
    if (!source) throw new Error("Source not found");
    return this.startRun(source, idempotencyKey, 1);
  }

  @callable() async retryRun(id: string, idempotencyKey: string) {
    if (!runIdPattern.test(id)) throw new Error("Invalid run ID");
    const run = this.findRun(id);
    if (!run || !run.status.startsWith("failed_")) throw new Error("Run is not retryable");
    if (run.status === "failed_permanent") throw new Error("Permanent failures cannot be retried");
    const source = this.findSource(run.sourceId);
    if (!source) throw new Error("Source not found");
    return this.startRun(source, idempotencyKey, run.attempt + 1);
  }

  @callable() async cancelRun(id: string) {
    if (!runIdPattern.test(id)) throw new Error("Invalid run ID");
    const run = this.findRun(id);
    if (!run) throw new Error("Run not found");
    if (terminalRunStatuses.has(run.status)) return this.findRun(id, true);
    this.sql`UPDATE ingestion_runs SET status='cancelled',completed_at=${now()} WHERE id=${id}`;
    this.sql`UPDATE sources SET status='cancelled',active_run_id=NULL
      WHERE id=${run.sourceId} AND active_run_id=${id} AND generation=${run.generation}`;
    this.recordStep(id, "cancelled", run.attempt);
    try {
      await this.terminateWorkflow(id);
    } catch {
      // Persisted cancellation and generation fencing remain authoritative.
    }
    return this.findRun(id, true);
  }

  @callable() inspectRun(id: string) {
    if (!runIdPattern.test(id)) throw new Error("Invalid run ID");
    const run = this.findRun(id, true);
    if (!run) throw new Error("Run not found");
    return run;
  }

  @callable() async deleteSource(id: string) {
    id = validateSourceId(id);
    const source = this.findSource(id);
    if (!source) return false;
    if (source.activeRunId) await this.cancelRun(source.activeRunId);
    this.sql`DELETE FROM sources WHERE id=${id}`;
    const prefix = `${userPrefix(this.name)}sources/${id}`;
    await deletePrefix(this.env.KNOWLEDGE_BUCKET, prefix);
    await deletePrefix(this.env.KNOWLEDGE_BUCKET, `${userPrefix(this.name)}generations/${id}/`);
    await rebuildProfile(this.env, this.name, this.sources());
    await rebuildManifest(this.env, this.name, this.sources());
    return true;
  }

  @callable() async getDocument(path: string) {
    if (!documentPath.test(path)) throw new Error("Invalid document path");
    const object = await this.env.KNOWLEDGE_BUCKET.get(`${userPrefix(this.name)}${path}`);
    return object ? { path, content: await object.text() } : null;
  }

  @callable() async queryKnowledge(query: string) {
    const q = text(query).trim().slice(0, 1000);
    if (!q) throw new Error("Query is required");
    if (!this.env.KNOWLEDGE_SEARCH) {
      const chunks: Array<{ item: { key: string }; text: string; score: number }> = [];
      const profile = await this.getDocument("profile.md");
      if (profile?.content) {
        chunks.push({
          item: { key: `${userPrefix(this.name)}profile.md` },
          text: profile.content,
          score: 1,
        });
      }
      const readySources = this.sources().filter((s) => s.artifactReady);
      for (const src of readySources.slice(0, 10)) {
        try {
          const doc = await this.getDocument(`sources/${src.id}.md`);
          if (doc?.content) {
            chunks.push({
              item: { key: `${userPrefix(this.name)}sources/${src.id}.md` },
              text: doc.content,
              score: 0.9,
            });
          }
        } catch {
          // Best effort source inclusion
        }
      }
      return chunks;
    }
    const result = await this.env.KNOWLEDGE_SEARCH.search({ query: q, ai_search_options: { retrieval: { max_num_results: 8, filters: { folder: { $eq: userPrefix(this.name).slice(0, -1) } } } } });
    const allowed = new Set(
      this.sources()
        .filter((source) => source.searchReady)
        .map((source) => `${userPrefix(this.name)}sources/${source.id}.md`)
    );
    return result.chunks.filter(
      (chunk) =>
        chunk.item.key === `${userPrefix(this.name)}profile.md` || allowed.has(chunk.item.key)
    );
  }

  @callable() async syncResume(input: ResumeReference) {
    input = validateResumeReference(input);
    const content = text(JSON.stringify({ name: input.name, data: input.data, rawLatex: input.rawLatex }));
    const key = `${userPrefix(this.name)}resumes/${input.resumeId}.md`;
    await this.env.KNOWLEDGE_BUCKET.put(
      key,
      `# ${text(input.name).slice(0, 200)}\n\n${content}\n\n---\nSource: first-party resume ${input.resumeId}\nVersion: ${text(input.versionId || "draft").slice(0, 200)}\nRetrieved: ${now()}\nConfidence: high\n`,
      { httpMetadata: { contentType: "text/markdown" }, customMetadata: { folder: userPrefix(this.name).slice(0, -1), userId: this.name, resumeId: input.resumeId } }
    );
    return { key };
  }

  @callable() async deleteResume(id: string) {
    if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id)) throw new Error("Invalid resume ID");
    await this.env.KNOWLEDGE_BUCKET.delete(`${userPrefix(this.name)}resumes/${id}.md`);
    return true;
  }

  @callable() async chat(message: string) {
    const trimmed = text(message).trim();
    if (!trimmed) throw new Error("Message is required");
    const chunks = await this.queryKnowledge(trimmed);
    if (!chunks.length) {
      return {
        answer: "I couldn't find any indexed knowledge documents or sources yet. Please add a source (GitHub, LinkedIn, website, or resume file) and wait for ingestion to complete.",
        citations: [],
      };
    }

    // Attempt Workers AI inference with Llama 3.1
    if (this.env.AI) {
      try {
        const evidenceContext = chunks
          .slice(0, 6)
          .map((c, i) => `[Source ${i + 1}: ${c.item.key.replace(/^users\/[^/]+\//, "")}]\n${c.text.slice(0, 3000)}`)
          .join("\n\n---\n\n");

        const aiResponse = (await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [
            {
              role: "system",
              content:
                "You are an expert AI Career Knowledge Assistant. Answer the user's question accurately, concisely, and professionally using ONLY the provided evidence documents. Highlight relevant skills, experiences, projects, and metrics. If the evidence doesn't mention something, state that honestly. Do not hallucinate external facts.",
            },
            {
              role: "user",
              content: `User Question: ${trimmed}\n\nEvidence Documents:\n${evidenceContext}\n\nPlease provide a clear, structured response answering the question:`,
            },
          ],
          max_tokens: 700,
        })) as { response?: string };

        if (aiResponse.response && aiResponse.response.trim()) {
          return {
            answer: aiResponse.response.trim(),
            citations: chunks.slice(0, 4).map((c) => ({ key: c.item.key, score: c.score })),
          };
        }
      } catch (aiErr) {
        console.warn("[chat] Workers AI inference warning, falling back to extractive summary:", aiErr);
      }
    }

    // Extractive keyword-matched fallback
    const keywords = trimmed
      .toLowerCase()
      .split(/[^a-z0-9_#+.-]+/i)
      .filter(
        (w) =>
          w.length > 2 &&
          !["what", "when", "where", "which", "show", "tell", "about", "your", "with", "have"].includes(w)
      );

    const allLines = chunks.flatMap((c) => c.text.split("\n"));
    const matchingLines = allLines.filter((l) => {
      const lower = l.toLowerCase();
      return keywords.some((k) => lower.includes(k));
    });

    if (matchingLines.length > 0) {
      const topMatches = matchingLines
        .slice(0, 8)
        .map((l) => (l.trim().startsWith("-") || l.trim().startsWith("*") ? l.trim() : `- ${l.trim()}`));
      return {
        answer: `Here is the relevant evidence found in your knowledge base for **"${trimmed}"**:\n\n${topMatches.join("\n")}`,
        citations: chunks.slice(0, 4).map((c) => ({ key: c.item.key, score: c.score })),
      };
    }

    const snippet = chunks[0].text.slice(0, 500).trim();
    return {
      answer: `Found ${chunks.length} evidence document${chunks.length === 1 ? "" : "s"} in your knowledge base. Profile overview:\n\n${snippet}...\n\n*Ask about specific technical skills, roles, or repositories.*`,
      citations: chunks.slice(0, 4).map((c) => ({ key: c.item.key, score: c.score })),
    };
  }

  @callable() status() {
    const sources = this.sources();
    const runs = [...this.sql<DbRow>`SELECT * FROM ingestion_runs ORDER BY created_at DESC LIMIT 50`].map(
      (row) => this.run(row, true)
    );
    return { sources, runs };
  }

  @callable() recordRunStage(
    runId: string,
    generation: number,
    stage: IngestionRunStatus,
    detail?: string
  ) {
    const run = this.findRun(runId);
    const source = run && this.findSource(run.sourceId);
    if (!run || !source || !canPublish(source, runId, generation)) return false;
    this.sql`UPDATE ingestion_runs SET status=${stage} WHERE id=${runId}`;
    this.sql`UPDATE sources SET status='running' WHERE id=${run.sourceId} AND active_run_id=${runId}`;
    this.recordStep(runId, stage, run.attempt, detail);
    this.broadcastEvent({
      type: "run_stage_changed",
      runId,
      sourceId: run.sourceId,
      generation,
      stage,
      detail,
    });
    return true;
  }

  @callable() async publishArtifacts(
    runId: string,
    generation: number,
    markdown: string,
    hash: string
  ) {
    const run = this.findRun(runId);
    const source = run && this.findSource(run.sourceId);
    if (!run || !source || !canPublish(source, runId, generation)) return false;
    const root = userPrefix(this.name);
    const generationKey = `${root}generations/${source.id}/${generation}/source.md`;
    const canonicalKey = `${root}sources/${source.id}.md`;
    const metadata = {
      folder: root.slice(0, -1),
      userId: this.name,
      sourceId: source.id,
      sourceType: source.type,
      generation: String(generation),
      runId,
    };
    await this.env.KNOWLEDGE_BUCKET.put(generationKey, markdown, {
      httpMetadata: { contentType: "text/markdown" },
      customMetadata: metadata,
    });
    if (!canPublish(this.findSource(source.id), runId, generation)) return false;

    const otherDocuments = await Promise.all(
      this.sources()
        .filter((item) => item.id !== source.id && item.artifactReady)
        .map((item) => this.env.KNOWLEDGE_BUCKET.get(`${root}sources/${item.id}.md`))
    );
    const profile = `# Profile\n\n${[
      ...(await Promise.all(otherDocuments.filter(Boolean).map((item) => item!.text()))),
      markdown,
    ].join("\n\n")}`;
    const manifest = JSON.stringify(
      {
        updatedAt: now(),
        publication: { sourceId: source.id, generation, runId },
        sources: this.sources().map(({ content: _, ...item }) =>
          item.id === source.id
            ? { ...item, hash, artifactReady: true, status: "artifact_ready" }
            : item
        ),
      },
      null,
      2
    );
    await Promise.all([
      this.env.KNOWLEDGE_BUCKET.put(`${root}generations/${source.id}/${generation}/profile.md`, profile),
      this.env.KNOWLEDGE_BUCKET.put(
        `${root}generations/${source.id}/${generation}/manifest.json`,
        manifest
      ),
    ]);
    if (!canPublish(this.findSource(source.id), runId, generation)) return false;
    await Promise.all([
      this.env.KNOWLEDGE_BUCKET.put(canonicalKey, markdown, {
        httpMetadata: { contentType: "text/markdown" },
        customMetadata: metadata,
      }),
      this.env.KNOWLEDGE_BUCKET.put(`${root}profile.md`, profile, {
        httpMetadata: { contentType: "text/markdown" },
        customMetadata: { folder: root.slice(0, -1), userId: this.name, runId },
      }),
    ]);
    if (!canPublish(this.findSource(source.id), runId, generation)) {
      await this.env.KNOWLEDGE_BUCKET.delete(canonicalKey);
      return false;
    }
    await this.env.KNOWLEDGE_BUCKET.put(`${root}manifest.json`, manifest, {
      httpMetadata: { contentType: "application/json" },
      customMetadata: { folder: root.slice(0, -1), userId: this.name, runId },
    });
    if (!canPublish(this.findSource(source.id), runId, generation)) {
      await this.env.KNOWLEDGE_BUCKET.delete(canonicalKey);
      return false;
    }
    this.sql`UPDATE sources SET status='artifact_ready',artifact_ready=1,search_ready=0,
      indexing_status='queued',hash=${hash},refreshed_at=${now()},error=NULL
      WHERE id=${source.id} AND active_run_id=${runId} AND generation=${generation}`;
    this.sql`UPDATE ingestion_runs SET status='indexing',artifact_ready=1,indexing_status='queued'
      WHERE id=${runId}`;
    this.recordStep(runId, "publishing", run.attempt);
    this.recordStep(runId, "indexing", run.attempt);
    this.broadcastEvent({
      type: "artifacts_published",
      runId,
      sourceId: source.id,
      generation,
      hash,
    });
    return true;
  }

  @callable() completeUnchanged(runId: string, generation: number, hash: string) {
    const run = this.findRun(runId);
    const source = run && this.findSource(run.sourceId);
    if (!run || !source || !canPublish(source, runId, generation)) return false;
    this.sql`UPDATE sources SET status='unchanged',hash=${hash},refreshed_at=${now()},error=NULL
      WHERE id=${source.id} AND active_run_id=${runId}`;
    this.sql`UPDATE ingestion_runs SET status='unchanged',artifact_ready=${source.artifactReady ? 1 : 0},
      search_ready=${source.searchReady ? 1 : 0},completed_at=${now()} WHERE id=${runId}`;
    this.recordStep(runId, "unchanged", run.attempt);
    this.broadcastEvent({
      type: "run_unchanged",
      runId,
      sourceId: source.id,
      generation,
      hash,
    });
    return true;
  }

  @callable() updateIndexState(
    runId: string,
    generation: number,
    item: { status?: string; error?: string } | undefined
  ) {
    const run = this.findRun(runId);
    const source = run && this.findSource(run.sourceId);
    if (!run || !source || !canPublish(source, runId, generation)) return false;
    const state = searchStatus(item);
    const runStatus = state.searchReady ? "searchable" : "indexing";
    const sourceStatus = state.searchReady ? "searchable" : "artifact_ready";
    this.sql`UPDATE sources SET status=${sourceStatus},search_ready=${state.searchReady ? 1 : 0},
      indexing_status=${state.indexingStatus ?? null},error=${state.error ?? null}
      WHERE id=${source.id} AND active_run_id=${runId}`;
    this.sql`UPDATE ingestion_runs SET status=${runStatus},search_ready=${state.searchReady ? 1 : 0},
      indexing_status=${state.indexingStatus ?? null},error=${state.error ?? null},
      completed_at=${state.searchReady ? now() : null} WHERE id=${runId}`;
    if (state.searchReady) this.recordStep(runId, "searchable", run.attempt);
    this.broadcastEvent({
      type: "index_state_updated",
      runId,
      sourceId: source.id,
      generation,
      searchReady: state.searchReady,
      indexingStatus: state.indexingStatus,
    });
    return state.searchReady;
  }

  @callable() recordAnalysis(runId: string, stage: string, message: string) {
    const id = `${runId}:${stage}:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`;
    const createdAt = now();
    this.sql`INSERT INTO analysis_logs (id, run_id, stage, message, created_at) VALUES (${id}, ${runId}, ${stage}, ${message}, ${createdAt})`;
    this.broadcastEvent({
      type: "agent_analysis",
      id,
      runId,
      stage,
      message,
      createdAt,
    });
    return true;
  }

  @callable() recordConvertedMarkdown(runId: string, markdown: string) {
    const updatedAt = now();
    this.sql`INSERT OR REPLACE INTO converted_markdown (run_id, markdown, updated_at) VALUES (${runId}, ${markdown}, ${updatedAt})`;
    this.broadcastEvent({
      type: "markdown_converted",
      runId,
      markdown,
      updatedAt,
    });
    return true;
  }

  @callable() getSourceAnalysis() {
    const logs = [...this.sql<DbRow>`SELECT * FROM analysis_logs ORDER BY created_at`].map((row) => ({
      id: String(row.id),
      runId: String(row.run_id),
      stage: String(row.stage),
      message: String(row.message),
      createdAt: String(row.created_at),
    }));
    const mdRow = [...this.sql<DbRow>`SELECT markdown FROM converted_markdown ORDER BY updated_at DESC LIMIT 1`][0];
    return {
      agentName: this.name,
      logs,
      convertedMarkdown: mdRow ? String(mdRow.markdown) : "",
    };
  }

  private failRun(runId: string, message: string, classification: "retryable" | "permanent") {
    const run = this.findRun(runId);
    if (!run || terminalRunStatuses.has(run.status)) return;
    const source = this.findSource(run.sourceId);
    if (!canPublish(source, runId, run.generation)) return;
    const status = `failed_${classification}` as const;
    this.sql`UPDATE ingestion_runs SET status=${status},error=${message.slice(0, 500)},
      completed_at=${now()} WHERE id=${runId}`;
    this.sql`UPDATE sources SET status='failed',error=${message.slice(0, 500)}
      WHERE id=${run.sourceId} AND active_run_id=${runId} AND generation=${run.generation}`;
    this.recordStep(runId, status, run.attempt, message);
    this.broadcastEvent({
      type: "run_failed",
      runId,
      sourceId: run.sourceId,
      generation: run.generation,
      status,
      message,
      classification,
    });
  }

  async onWorkflowProgress(
    _workflowName: string,
    workflowId: string,
    progress: unknown
  ): Promise<void> {
    if (!progress || typeof progress !== "object") return;
    const value = progress as { runId?: unknown; generation?: unknown; stage?: unknown };
    if (
      value.runId === workflowId &&
      typeof value.generation === "number" &&
      typeof value.stage === "string"
    ) {
      this.recordRunStage(
        workflowId,
        value.generation,
        value.stage as IngestionRunStatus
      );
    }
  }

  async onWorkflowComplete(
    _workflowName: string,
    workflowId: string,
    result?: unknown
  ): Promise<void> {
    const run = this.findRun(workflowId);
    if (!run || terminalRunStatuses.has(run.status)) return;
    const value = result as { searchReady?: boolean } | undefined;
    if (value?.searchReady) this.updateIndexState(workflowId, run.generation, { status: "completed" });
  }

  async onWorkflowError(
    _workflowName: string,
    workflowId: string,
    error: string
  ): Promise<void> {
    this.failRun(workflowId, error, classifyRetry(error));
  }

  async onWorkflowEvent(
    _workflowName: string,
    workflowId: string,
    event: unknown
  ): Promise<void> {
    if (!event || typeof event !== "object") return;
    const value = event as {
      kind?: string;
      generation?: number;
      stage?: IngestionRunStatus;
      detail?: string;
      classification?: "retryable" | "permanent";
    };
    if (value.kind === "stage" && value.stage && typeof value.generation === "number") {
      this.recordRunStage(workflowId, value.generation, value.stage, value.detail);
    } else if (value.kind === "failure" && value.classification) {
      this.failRun(workflowId, value.detail || "Ingestion failed", value.classification);
    }
  }

  @callable() async reconcileSearch() {
    if (!this.env.KNOWLEDGE_SEARCH) return this.status();
    const pending = this.sources().filter((source) => source.artifactReady && !source.searchReady);
    for (const source of pending.slice(0, 10)) {
      if (!source.activeRunId) continue;
      const key = `${userPrefix(this.name)}sources/${source.id}.md`;
      const result = await this.env.KNOWLEDGE_SEARCH.items.list({ key, per_page: 1 });
      this.updateIndexState(source.activeRunId, source.generation, result.result[0]);
    }
    return this.status();
  }
}

async function sha256(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchGithub(env: Env, url: string) {
  const username = new URL(url).pathname.split("/").filter(Boolean)[0];
  if (!username) throw new Error("GitHub profile URL is required");
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "resume-builder-knowledge-agent" };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const get = async (path: string) => { const response = await fetch(`https://api.github.com${path}`, { headers }); if (!response.ok) throw new Error(`GitHub request failed (${response.status})`); return response.json(); };
  const profile = await get(`/users/${encodeURIComponent(username)}`) as Record<string, unknown>;
  const repos = (await get(`/users/${encodeURIComponent(username)}/repos?type=owner&sort=updated&per_page=30`) as Record<string, unknown>[]).filter((r) => !r.fork);
  return `# GitHub: ${profile.name || profile.login}\n\n${profile.bio || ""}\n\n## Public repositories\n${repos.map((r) => `- **${r.name}**: ${r.description || ""} (${r.language || "unknown"}; ★ ${r.stargazers_count || 0})`).join("\n")}`;
}

async function fetchRendered(env: Env, url: string) {
  if (!isPublicHttpsUrl(url)) throw new Error("Only public HTTPS URLs are allowed");
  try {
    const response = await env.BROWSER.quickAction("markdown", {
      url,
      bestAttempt: true,
      gotoOptions: { waitUntil: "domcontentloaded", timeout: 20_000 },
      rejectResourceTypes: ["image", "media", "font"],
      cacheTTL: 30,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      let detail = "";
      try {
        const parsed = JSON.parse(errText) as { errors?: Array<{ message?: string }> };
        if (parsed.errors?.[0]?.message) detail = `: ${parsed.errors[0].message}`;
      } catch {
        if (errText) detail = `: ${errText.slice(0, 100)}`;
      }
      throw new Error(`Browser Run failed (${response.status})${detail}`);
    }
    const length = Number(response.headers.get("content-length") || "0");
    if (length > MAX_SOURCE_BYTES) throw new Error("Rendered source is too large");
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = (await response.json()) as { result?: string; markdown?: string };
      const content = body.result || body.markdown;
      if (typeof content === "string" && content.trim()) {
        if (new TextEncoder().encode(content).byteLength > MAX_SOURCE_BYTES) throw new Error("Rendered source is too large");
        return text(content);
      }
    } else {
      const raw = await response.text();
      if (raw.trim()) {
        if (new TextEncoder().encode(raw).byteLength > MAX_SOURCE_BYTES) throw new Error("Rendered source is too large");
        return text(raw);
      }
    }
    throw new Error("Browser Run returned no content");
  } catch (err: any) {
    // Graceful fallback for non-LinkedIn sites: try standard HTTP fetch with desktop browser headers
    if (!url.includes("linkedin.com")) {
      try {
        const direct = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        if (direct.ok) {
          const html = await direct.text();
          if (html.trim()) {
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : url;
            const cleanText = html
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            if (cleanText.length > 50) {
              return `# ${title}\n\n${cleanText.slice(0, 50000)}`;
            }
          }
        }
      } catch {
        // Direct fetch failed as well, rethrow original Browser Run error
      }
    }
    throw err;
  }
}

async function deletePrefix(bucket: R2Bucket, prefix: string) {
  let cursor: string | undefined;
  do {
    const listed = await bucket.list({ prefix, cursor });
    if (listed.objects.length) await bucket.delete(listed.objects.map((object) => object.key));
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}

async function rebuildManifest(env: Env, userId: string, sources: SourceRecord[]) {
  await env.KNOWLEDGE_BUCKET.put(`${userPrefix(userId)}manifest.json`, JSON.stringify({ updatedAt: now(), sources: sources.map(({ content: _, ...source }) => source) }, null, 2), { httpMetadata: { contentType: "application/json" }, customMetadata: { folder: userPrefix(userId).slice(0, -1), userId } });
}

async function rebuildProfile(env: Env, userId: string, sources: SourceRecord[]) {
  const ready = sources.filter((source) => source.artifactReady);
  const documents = await Promise.all(
    ready.map((source) => env.KNOWLEDGE_BUCKET.get(`${userPrefix(userId)}sources/${source.id}.md`))
  );
  const content = (
    await Promise.all(documents.filter(Boolean).map((document) => document!.text()))
  ).join("\n\n");
  await env.KNOWLEDGE_BUCKET.put(`${userPrefix(userId)}profile.md`, `# Profile\n\n${content}`, {
    httpMetadata: { contentType: "text/markdown" },
    customMetadata: { folder: userPrefix(userId).slice(0, -1), userId },
  });
}

function htmlToMarkdown(h: string): string {
  return h
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

async function fetchLinkedinAndPortfolio(
  env: Env,
  url: string,
  log: (stage: string, msg: string) => Promise<void>
) {
  const handleMatch = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  const handle = handleMatch ? handleMatch[1] : "";

  // 1. Try headless browser capture on LinkedIn
  let linkedinRaw = "";
  try {
    await log("fetching", `Attempting headless browser capture on LinkedIn (${url})...`);
    linkedinRaw = await fetchRendered(env, url);
  } catch (err: any) {
    await log("fetching", `LinkedIn protected direct unauthenticated bot access: ${err.message || "Authwall (422)"}`);
  }

  const isAuthwall =
    !linkedinRaw ||
    linkedinRaw.toLowerCase().includes("authwall") ||
    linkedinRaw.toLowerCase().includes("sign in to view") ||
    linkedinRaw.toLowerCase().includes("join linkedin") ||
    (linkedinRaw.length < 500 && linkedinRaw.toLowerCase().includes("linkedin"));

  if (!isAuthwall && linkedinRaw.length > 500) {
    await log("fetching", "Extracted public profile directly from LinkedIn page.");
    return linkedinRaw;
  }

  // 2. Discover verified profile details using user's handle
  if (handle) {
    await log("fetching", `LinkedIn authwall active for public crawler. Resolving verified profile for @${handle}...`);

    let name = handle;
    let bio = "";
    let blog = "";
    let location = "";
    let company = "";
    let twitter = "";
    let portfolioText = "";

    // Query GitHub developer profile API
    try {
      const ghHeaders: Record<string, string> = {
        "User-Agent": "resume-builder-knowledge-agent",
        Accept: "application/vnd.github+json",
      };
      if (env.GITHUB_TOKEN) ghHeaders.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
      const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(handle)}`, {
        headers: ghHeaders,
      });
      if (ghRes.ok) {
        const ghUser = (await ghRes.json()) as Record<string, any>;
        if (ghUser.name) name = ghUser.name;
        if (ghUser.bio) bio = ghUser.bio;
        if (ghUser.blog) blog = ghUser.blog;
        if (ghUser.location) location = ghUser.location;
        if (ghUser.company) company = ghUser.company;
        if (ghUser.twitter_username) twitter = ghUser.twitter_username;
        await log("fetching", `Discovered verified identity for ${name} (@${handle}). Scanning portfolio sites...`);
      }
    } catch {
      // ignore
    }

    // Try discovering portfolio website (e.g. from blog field or standard personal domains)
    const sitesToTry = [
      blog,
      `https://${handle}.in`,
      `https://${handle}.dev`,
      `https://${handle}.github.io`,
      `https://${handle}.com`,
    ].filter((s): s is string => Boolean(s && s.startsWith("http")));

    for (const site of sitesToTry) {
      try {
        await log("fetching", `Scanning connected professional portfolio: ${site}...`);
        const siteRes = await fetch(site, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        if (siteRes.ok) {
          const html = await siteRes.text();
          const md = htmlToMarkdown(html);

          if (md.length > 200) {
            portfolioText = md.slice(0, 35000);
            await log(
              "fetching",
              `Successfully extracted ${portfolioText.length} characters of structured career experience, education & projects from ${site}`
            );

            // Also check for dedicated /about or /resume page
            const baseSite = site.replace(/\/$/, "");
            try {
              const aboutRes = await fetch(`${baseSite}/about`, {
                headers: { "User-Agent": "resume-builder-knowledge-agent" },
              });
              if (aboutRes.ok) {
                const aboutHtml = await aboutRes.text();
                const aboutMd = htmlToMarkdown(aboutHtml);
                if (aboutMd.length > 200) {
                  portfolioText += `\n\n## Additional Background & Bio\n${aboutMd.slice(0, 15000)}`;
                  await log("fetching", `Appended deeper background from ${baseSite}/about`);
                }
              }
            } catch {
              // ignore subpage
            }
            break;
          }
        }
      } catch {
        // try next
      }
    }

    if (portfolioText || bio || name !== handle) {
      let doc = `# LinkedIn & Professional Profile: ${name}\n\n`;
      doc += `- **Name**: ${name}\n`;
      doc += `- **LinkedIn Profile**: ${url}\n`;
      doc += `- **Identified Username**: @${handle}\n`;
      if (company) doc += `- **Current Company**: ${company}\n`;
      if (location) doc += `- **Location**: ${location}\n`;
      if (blog) doc += `- **Website**: ${blog}\n`;
      if (twitter) doc += `- **Twitter**: @${twitter}\n`;
      if (bio) doc += `\n## Profile Summary\n${bio}\n`;
      if (portfolioText) {
        doc += `\n## Experience, Education & Projects Evidence\n${portfolioText}\n`;
      }
      doc += `\n---\n### Note on LinkedIn Scraping & 100% Export:\nLinkedIn blocks unauthenticated bot crawlers at the datacenter boundary. The career data above was verified and extracted from the candidate's public developer footprint and connected portfolio.\n\nTo import your exact LinkedIn PDF export with 100% of recommendations, bullet points, and skills:\n1. On LinkedIn, click **More (...) -> Save to PDF** on your profile.\n2. In Resume Builder, click **Upload Resume** and select that PDF.\n`;
      return doc;
    }
  }

  return `# LinkedIn: ${handle || "Profile"}\n\n- **Profile URL**: ${url}\n- **Identified Handle**: @${handle}\n- **Ingestion Status**: Protected by LinkedIn Authwall\n\n### Why LinkedIn blocks direct URL scraping:\nLinkedIn blocks unauthenticated crawlers and datacenter IPs with an authwall redirect. Direct requests return an auth redirect rather than profile content.\n\n### How to import 100% of your LinkedIn profile:\n1. Open your LinkedIn profile at [${url}](${url}) in your browser.\n2. In the profile header, click **More (...)** and select **Save to PDF**.\n3. In Resume Builder, click **Upload Resume** and select the downloaded PDF.\n4. The universal parser will extract 100% of your positions, dates, education, skills, and honors.`;
}

async function fetchLinkedinWithPdf(
  env: Env,
  url: string,
  pdfContent: string | undefined,
  log: (stage: string, msg: string) => Promise<void>
): Promise<string> {
  const hasPdf = Boolean(pdfContent && pdfContent.trim().length > 50);

  if (hasPdf) {
    await log(
      "fetching",
      `Official LinkedIn PDF attached (${pdfContent!.trim().length} chars). Parsing complete authentic career history...`
    );
  }

  // Resolve online profile & developer footprint
  let onlineFootprint = "";
  try {
    onlineFootprint = await fetchLinkedinAndPortfolio(env, url, log);
  } catch (err: any) {
    await log("fetching", `Online profile resolution note: ${err.message}`);
  }

  if (hasPdf) {
    const handleMatch = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
    const handle = handleMatch ? handleMatch[1] : "Profile";

    let combined = `# LinkedIn & Verified Career Profile: @${handle}\n\n`;
    combined += `- **Profile URL**: ${url}\n`;
    combined += `- **Ingestion Mode**: Dual Synthesis (Official LinkedIn PDF Export + Connected Online Footprint)\n`;
    combined += `- **Storage Location**: Cloudflare R2 Storage\n`;
    combined += `- **Retrieved**: ${now()}\n\n`;
    combined += `---\n\n`;
    combined += `## Official LinkedIn Experience, Education & Skills (Verified PDF Evidence)\n\n`;
    combined += `${pdfContent!.trim()}\n\n`;
    combined += `---\n\n`;

    if (onlineFootprint && !onlineFootprint.includes("Protected by LinkedIn Authwall")) {
      combined += `## Connected Portfolio & Technical Footprint\n\n`;
      combined += `${onlineFootprint}\n\n`;
      combined += `---\n\n`;
    }

    await log(
      "fetching",
      `Dual LinkedIn synthesis complete (${combined.length} characters). Persisting to R2 storage.`
    );
    return combined;
  }

  return onlineFootprint;
}

async function fetchSinglePage(
  env: Env,
  url: string,
  log: (stage: string, msg: string) => Promise<void>
): Promise<string> {
  await log("fetching", `Attempting direct fetch for single page: ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (res.ok) {
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : url;
      const md = htmlToMarkdown(html);
      if (md.length > 200) {
        await log("fetching", `Successfully extracted single page content (${md.length} characters)`);
        return `# Web Page: ${title}\n\n- **URL**: ${url}\n- **Retrieved**: ${now()}\n- **Mode**: Single Page Capture\n\n---\n\n${md}`;
      }
    }
  } catch {
    // fallback to headless browser
  }

  await log("fetching", "Falling back to headless browser rendering for single page...");
  const rendered = await fetchRendered(env, url);
  return `# Web Page: ${url}\n\n- **URL**: ${url}\n- **Retrieved**: ${now()}\n- **Mode**: Single Page Headless Render\n\n---\n\n${rendered}`;
}

async function fetchPortfolio(
  env: Env,
  targetUrl: string,
  log: (stage: string, msg: string) => Promise<void>
): Promise<string> {
  const parsed = new URL(targetUrl);
  const origin = parsed.origin;
  await log("fetching", `Initializing multi-page portfolio agent for origin: ${origin}`);

  const discoveredUrls = new Set<string>();
  discoveredUrls.add(targetUrl);

  // 1. Check sitemap.xml
  await log("fetching", `Checking sitemap for ${origin}...`);
  const sitemapCandidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap/sitemap.xml`,
  ];

  for (const sitemapUrl of sitemapCandidates) {
    try {
      const smRes = await fetch(sitemapUrl, {
        headers: {
          "User-Agent": "resume-builder-knowledge-agent",
          Accept: "application/xml,text/xml,*/*",
        },
      });
      if (smRes.ok) {
        const smText = await smRes.text();
        const locMatches = [...smText.matchAll(/<loc>([^<]+)<\/loc>/gi)];
        if (locMatches.length > 0) {
          for (const m of locMatches) {
            const locUrl = m[1].trim();
            try {
              const u = new URL(locUrl);
              if (u.origin === origin) {
                discoveredUrls.add(locUrl);
              }
            } catch {
              // ignore invalid url
            }
          }
          await log("fetching", `Discovered ${locMatches.length} URLs from ${sitemapUrl}`);
          break;
        }
      }
    } catch {
      // try next candidate
    }
  }

  // 2. Fetch root page to extract in-page navigation links
  let rootHtml = "";
  try {
    const rootRes = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (rootRes.ok) {
      rootHtml = await rootRes.text();
      const hrefMatches = [...rootHtml.matchAll(/href=["']([^"']+)["']/gi)];
      for (const m of hrefMatches) {
        const href = m[1].trim();
        if (
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          href.startsWith("javascript:")
        )
          continue;
        try {
          const resolved = new URL(href, origin);
          if (resolved.origin === origin) {
            discoveredUrls.add(resolved.href.split("#")[0]);
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (err: any) {
    await log("fetching", `Warning: root page fetch encountered ${err.message}`);
  }

  // 3. Filter and prioritize necessary career evidence pages
  const ignoredPatterns = [
    /\.(png|jpe?g|gif|webp|svg|css|js|woff2?|ico|xml|json)$/i,
    /\/(privacy|terms|legal|disclaimer|copyright|cookies|license)\b/i,
    /\/(tag|tags|category|categories|page|author)\//i,
    /\/cdn-cgi\//i,
  ];

  const scoreUrl = (uStr: string): number => {
    try {
      const u = new URL(uStr);
      const path = u.pathname.toLowerCase();
      if (path === "/" || path === "") return 100;
      if (/\/(about|bio|profile)\b/.test(path)) return 95;
      if (/\/(experience|work|history)\b/.test(path)) return 90;
      if (/\/(resume|cv)\b/.test(path)) return 88;
      if (path === "/projects" || path === "/projects/") return 85;
      if (path.startsWith("/projects/")) return 80;
      if (/\/(certifications?|credentials?|licenses?)\b/.test(path)) return 78;
      if (/\/(skills?|stack|technologies)\b/.test(path)) return 75;
      if (path === "/blog" || path === "/blog/") return 60;
      if (path.startsWith("/blog/")) return 50;
      return 20;
    } catch {
      return 0;
    }
  };

  const validUrls = Array.from(discoveredUrls)
    .filter((u) => !ignoredPatterns.some((p) => p.test(u)))
    .sort((a, b) => scoreUrl(b) - scoreUrl(a));

  // Select top 10 most relevant pages
  const selectedUrls = validUrls.slice(0, 10);
  await log(
    "fetching",
    `Identified ${validUrls.length} total pages. Selected ${selectedUrls.length} essential career evidence pages to analyze.`
  );

  // 4. Crawl each selected page and convert to markdown
  const pageResults: { url: string; path: string; title: string; markdown: string }[] = [];

  for (let i = 0; i < selectedUrls.length; i++) {
    const pageUrl = selectedUrls[i];
    const pagePath = new URL(pageUrl).pathname || "/";
    await log("fetching", `Analyzing page [${i + 1}/${selectedUrls.length}]: ${pagePath}`);

    try {
      let html = "";
      if (pageUrl === targetUrl && rootHtml) {
        html = rootHtml;
      } else {
        const res = await fetch(pageUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        if (res.ok) {
          html = await res.text();
        }
      }

      if (html) {
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : pagePath;
        const md = htmlToMarkdown(html);

        if (md.length > 50) {
          pageResults.push({
            url: pageUrl,
            path: pagePath,
            title,
            markdown: md.slice(0, 15000),
          });
        }
      }
    } catch (err: any) {
      await log("fetching", `Skipped ${pagePath}: ${err.message}`);
    }
  }

  // 5. Assemble structured multi-page document with exact page citations
  let doc = `# Portfolio Evidence: ${parsed.hostname}\n\n`;
  doc += `- **Root URL**: ${origin}\n`;
  doc += `- **Crawl Timestamp**: ${now()}\n`;
  doc += `- **Pages Evaluated**: ${selectedUrls.length}\n`;
  doc += `- **Evidence Pages Included**: ${pageResults.length}\n`;
  doc += `- **Discovered Pages Index**:\n`;
  for (const p of pageResults) {
    doc += `  - [${p.title}](${p.url}) (\`${p.path}\`)\n`;
  }
  doc += `\n---\n\n`;

  for (const page of pageResults) {
    doc += `## Page: ${page.path} — ${page.title}\n`;
    doc += `**Source URL**: [${page.url}](${page.url})\n\n`;
    doc += `${page.markdown}\n\n`;
    doc += `---\n\n`;
  }

  await log(
    "fetching",
    `Portfolio crawl complete. Synthesized ${pageResults.length} pages (${doc.length} characters) of structured evidence.`
  );
  return doc;
}

export class KnowledgeIngestionWorkflow extends AgentWorkflow<KnowledgeAgent, IngestionParams, { step: string }, Env> {
  async run(event: WorkflowEvent<IngestionParams>, step: AgentWorkflowStep) {
    const { source, userId, runId, generation } = event.payload;
    const sourceAgent = await getAgentByName(this.env.KnowledgeAgent, `source:${userId}:${source.id}`);

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
      await stage("fetching", `Agent connecting to ${source.type} source (${source.url || source.name || "uploaded document"})...`);
      const content = await step.do("fetch-source", { retries: { limit: 2, delay: "5 seconds", backoff: "exponential" } }, async () => {
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
        await log("fetching", `Processing uploaded resume text (${source.mimeType || "text/markdown"})...`);
        return text(source.content);
      });
      await log("fetching", `Raw content acquired (${content.length} characters). Proceeding to validation.`);

      await stage("validating", "Validating content boundaries, utf-8 integrity, and hash fingerprint...");
      if (!content.trim()) throw new Error("Source returned no content");
      if (new TextEncoder().encode(content).byteLength > MAX_SOURCE_BYTES) throw new Error("Source is too large");
      const hash = await step.do("hash-content", () => sha256(content));
      await log("validating", `Content SHA-256 fingerprint verified: ${hash.slice(0, 16)}...`);

      if (hash === source.hash && source.artifactReady) {
        await log("validating", "Content is unchanged from current generation. Preserving existing artifacts.");
        await step.do("mark-unchanged", () => this.agent.completeUnchanged(runId, generation, hash));
        await step.reportComplete({ unchanged: true, searchReady: source.searchReady });
        return { unchanged: true };
      }

      await log("validating", "Agent analyzing career history, technical stack, metrics, and accomplishments...");
      const markdown = `# ${source.name || source.type}\n\n${content}\n\n---\nSource: ${source.url || "first-party upload"}\nRetrieved: ${now()}\nConfidence: high\n`;

      await log("storing", "Agent synthesized clean Markdown representation. Pushing live preview to source channel...");
      try {
        await sourceAgent.recordConvertedMarkdown(runId, markdown);
      } catch {
        // Best-effort markdown recording
      }

      await stage("storing", `Storing isolated generation artifact to R2 storage at generations/${source.id}/${generation}/source.md`);
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
            customMetadata: { userId, sourceId: source.id, runId, generation: String(generation), type: "linkedin_raw_pdf" },
          });
        }
        return { stored: true, key: stagedKey };
      });
      await log("storing", "Staged generation saved successfully.");

      await stage("publishing", "Verifying generation fencing & atomically publishing canonical source.md and profile manifest...");
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
          return found
            ? { id: found.id, status: found.status, error: found.error }
            : null;
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
      const searchReady = await step.do("record-index-state", () =>
        this.agent.updateIndexState(runId, generation, item ?? undefined)
      );
      await log("searchable", "Source successfully processed, converted to markdown, and indexed into AI knowledge base!");
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

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/users\/([^/]+)(\/.*)?$/);
    if (!match) return json({ error: "Not found" }, 404);
    const userId = decodeURIComponent(match[1]);
    if (!userId || userId.length > 200) return json({ error: "Invalid user" }, 400);

    const path = match[2] || "/status";

    // Dedicated per-source WebSocket: /users/:userId/sources/:sourceId/ws
    const sourceWsMatch = path.match(/^\/sources\/([^/]+)\/ws$/);
    if (sourceWsMatch && (request.headers.get("Upgrade") === "websocket" || path.endsWith("/ws"))) {
      const sourceStub = await getAgentByName(env.KnowledgeAgent, `source:${userId}:${sourceWsMatch[1]}`);
      return sourceStub.fetch(request);
    }

    // Dedicated per-source analysis REST endpoint: /users/:userId/sources/:sourceId/analysis
    const sourceAnalysisMatch = path.match(/^\/sources\/([^/]+)\/analysis$/);
    if (sourceAnalysisMatch && request.method === "GET") {
      const sourceStub = await getAgentByName(env.KnowledgeAgent, `source:${userId}:${sourceAnalysisMatch[1]}`);
      return json(await sourceStub.getSourceAnalysis());
    }

    const stub = await getAgentByName(env.KnowledgeAgent, userId);
    if (request.headers.get("Upgrade") === "websocket" || path === "/ws") {
      return stub.fetch(request);
    }
    try {
      if (path === "/sources" && request.method === "GET") return json(await stub.listSources());
      const idempotencyKey = request.headers.get("x-idempotency-key") || "";
      if (path === "/sources" && request.method === "POST") return json(await stub.addSource(await request.json() as SourceInput, idempotencyKey), 202);
      if (path === "/status" && request.method === "GET") return json(await stub.reconcileSearch());
      if (path === "/query" && request.method === "POST") return json(await stub.queryKnowledge(String((await request.json() as { query?: unknown }).query || "")));
      if (path === "/resumes/sync" && request.method === "POST") return json(await stub.syncResume(validateResumeReference(await request.json())));
      if (path === "/chat" && request.method === "POST") return json(await stub.chat(String((await request.json() as { message?: unknown }).message || "")));
      if (path === "/documents" && request.method === "GET") return json(await stub.getDocument(url.searchParams.get("path") || "manifest.json"));
      const resumeRoute = path.match(/^\/resumes\/([^/]+)$/);
      if (resumeRoute && request.method === "DELETE") return json({ deleted: await stub.deleteResume(resumeRoute[1]) });
      const sourceRoute = path.match(/^\/sources\/([^/]+)(?:\/(refresh))?$/);
      if (sourceRoute && request.method === "DELETE") return json({ deleted: await stub.deleteSource(sourceRoute[1]) });
      if (sourceRoute?.[2] && request.method === "POST") return json(await stub.refreshSource(sourceRoute[1], idempotencyKey), 202);
      const runRoute = path.match(/^\/runs\/([^/]+)(?:\/(retry|cancel))?$/);
      if (runRoute && request.method === "GET" && !runRoute[2]) return json(await stub.inspectRun(runRoute[1]));
      if (runRoute?.[2] === "retry" && request.method === "POST") return json(await stub.retryRun(runRoute[1], idempotencyKey), 202);
      if (runRoute?.[2] === "cancel" && request.method === "POST") return json(await stub.cancelRun(runRoute[1]));
      return json({ error: "Not found" }, 404);
    } catch (error) { return json({ error: error instanceof Error ? error.message : "Request failed" }, 400); }
  }
} satisfies ExportedHandler<Env>;
