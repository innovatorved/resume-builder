import {
  Agent,
  type Connection,
  type ConnectionContext,
  callable,
  getAgentByName,
  type WSMessage,
} from "agents";
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
  userPrefix,
  validateResumeReference,
  validateSource,
  validateSourceId,
  verifyInternalSecret,
} from "./validation";
import { deletePrefix, now, rebuildManifest, rebuildProfile, text } from "./fetchers";
import { canPublish, classifyRetry, searchStatus, terminalRunStatuses } from "./workflow-state";
export { KnowledgeIngestionWorkflow } from "./workflow";

const json = (data: unknown, status = 200) => Response.json(data, { status });
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
    const columns = new Set(
      [...this.sql<{ name: string }>`PRAGMA table_info(sources)`].map((row) => row.name)
    );
    if (!columns.has("generation"))
      this.sql`ALTER TABLE sources ADD COLUMN generation INTEGER NOT NULL DEFAULT 0`;
    if (!columns.has("active_run_id")) this.sql`ALTER TABLE sources ADD COLUMN active_run_id TEXT`;
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
    this
      .sql`CREATE INDEX IF NOT EXISTS ingestion_runs_source_idx ON ingestion_runs(source_id, created_at DESC)`;
    this.sql`CREATE TABLE IF NOT EXISTS ingestion_steps (
      id TEXT PRIMARY KEY, run_id TEXT NOT NULL, stage TEXT NOT NULL, attempt INTEGER NOT NULL,
      detail TEXT, created_at TEXT NOT NULL
    )`;
    this
      .sql`CREATE INDEX IF NOT EXISTS ingestion_steps_run_idx ON ingestion_steps(run_id, created_at)`;
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
        const logs = [...this.sql<DbRow>`SELECT * FROM analysis_logs ORDER BY created_at`].map(
          (row) => ({
            id: String(row.id),
            runId: String(row.run_id),
            stage: String(row.stage),
            message: String(row.message),
            createdAt: String(row.created_at),
          })
        );
        const mdRow = [
          ...this
            .sql<DbRow>`SELECT markdown FROM converted_markdown ORDER BY updated_at DESC LIMIT 1`,
        ][0];
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
      const raw =
        typeof message === "string" ? message : new TextDecoder().decode(message as ArrayBuffer);
      const parsed = JSON.parse(raw);
      if (parsed.type === "ping") {
        connection.send(JSON.stringify({ type: "pong", timestamp: now() }));
      } else if (parsed.type === "inspect_run" && parsed.runId) {
        const runData = this.inspectRun(String(parsed.runId));
        connection.send(
          JSON.stringify({ type: "run_details", runId: parsed.runId, data: runData })
        );
      } else if (parsed.type === "refresh") {
        connection.send(
          JSON.stringify({ type: "status_update", status: this.status(), timestamp: now() })
        );
      } else if (parsed.type === "get_source_state") {
        const logs = [...this.sql<DbRow>`SELECT * FROM analysis_logs ORDER BY created_at`].map(
          (row) => ({
            id: String(row.id),
            runId: String(row.run_id),
            stage: String(row.stage),
            message: String(row.message),
            createdAt: String(row.created_at),
          })
        );
        const mdRow = [
          ...this
            .sql<DbRow>`SELECT markdown FROM converted_markdown ORDER BY updated_at DESC LIMIT 1`,
        ][0];
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
      record.steps = [
        ...this
          .sql<DbRow>`SELECT * FROM ingestion_steps WHERE run_id=${record.id} ORDER BY created_at`,
      ].map(
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

  private recordStep(runId: string, stage: IngestionRunStatus, attempt: number, detail?: string) {
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
    if (existing)
      return { source: this.findSource(String(existing.source_id)), run: this.run(existing) };

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
      this
        .sql`UPDATE ingestion_runs SET workflow_id=${workflowId},status='queued' WHERE id=${runId}`;
      this
        .sql`UPDATE sources SET status='running' WHERE id=${source.id} AND active_run_id=${runId}`;
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
    if (!idempotencyKey || idempotencyKey.length > 200)
      throw new Error("Idempotency key is required");
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
    if (!idempotencyKey || idempotencyKey.length > 200)
      throw new Error("Idempotency key is required");
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
    const result = await this.env.KNOWLEDGE_SEARCH.search({
      query: q,
      ai_search_options: {
        retrieval: {
          max_num_results: 8,
          filters: { folder: { $eq: userPrefix(this.name).slice(0, -1) } },
        },
      },
    });
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
    const content = text(
      JSON.stringify({ name: input.name, data: input.data, rawLatex: input.rawLatex })
    );
    const key = `${userPrefix(this.name)}resumes/${input.resumeId}.md`;
    await this.env.KNOWLEDGE_BUCKET.put(
      key,
      `# ${text(input.name).slice(0, 200)}\n\n${content}\n\n---\nSource: first-party resume ${input.resumeId}\nVersion: ${text(input.versionId || "draft").slice(0, 200)}\nRetrieved: ${now()}\nConfidence: high\n`,
      {
        httpMetadata: { contentType: "text/markdown" },
        customMetadata: {
          folder: userPrefix(this.name).slice(0, -1),
          userId: this.name,
          resumeId: input.resumeId,
        },
      }
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
        answer:
          "I couldn't find any indexed knowledge documents or sources yet. Please add a source (GitHub, LinkedIn, website, or resume file) and wait for ingestion to complete.",
        citations: [],
      };
    }

    // Attempt Workers AI inference with Llama 3.1
    if (this.env.AI) {
      try {
        const evidenceContext = chunks
          .slice(0, 6)
          .map(
            (c, i) =>
              `[Source ${i + 1}: ${c.item.key.replace(/^users\/[^/]+\//, "")}]\n${c.text.slice(0, 3000)}`
          )
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
        console.warn(
          "[chat] Workers AI inference warning, falling back to extractive summary:",
          aiErr
        );
      }
    }

    // Extractive keyword-matched fallback
    const keywords = trimmed
      .toLowerCase()
      .split(/[^a-z0-9_#+.-]+/i)
      .filter(
        (w) =>
          w.length > 2 &&
          ![
            "what",
            "when",
            "where",
            "which",
            "show",
            "tell",
            "about",
            "your",
            "with",
            "have",
          ].includes(w)
      );

    const allLines = chunks.flatMap((c) => c.text.split("\n"));
    const matchingLines = allLines.filter((l) => {
      const lower = l.toLowerCase();
      return keywords.some((k) => lower.includes(k));
    });

    if (matchingLines.length > 0) {
      const topMatches = matchingLines
        .slice(0, 8)
        .map((l) =>
          l.trim().startsWith("-") || l.trim().startsWith("*") ? l.trim() : `- ${l.trim()}`
        );
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
    const runs = [
      ...this.sql<DbRow>`SELECT * FROM ingestion_runs ORDER BY created_at DESC LIMIT 50`,
    ].map((row) => this.run(row, true));
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
    this
      .sql`UPDATE sources SET status='running' WHERE id=${run.sourceId} AND active_run_id=${runId}`;
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
      this.env.KNOWLEDGE_BUCKET.put(
        `${root}generations/${source.id}/${generation}/profile.md`,
        profile
      ),
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
    this
      .sql`UPDATE ingestion_runs SET status='unchanged',artifact_ready=${source.artifactReady ? 1 : 0},
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
    this
      .sql`UPDATE ingestion_runs SET status=${runStatus},search_ready=${state.searchReady ? 1 : 0},
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
    this
      .sql`INSERT INTO analysis_logs (id, run_id, stage, message, created_at) VALUES (${id}, ${runId}, ${stage}, ${message}, ${createdAt})`;
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
    this
      .sql`INSERT OR REPLACE INTO converted_markdown (run_id, markdown, updated_at) VALUES (${runId}, ${markdown}, ${updatedAt})`;
    this.broadcastEvent({
      type: "markdown_converted",
      runId,
      markdown,
      updatedAt,
    });
    return true;
  }

  @callable() getSourceAnalysis() {
    const logs = [...this.sql<DbRow>`SELECT * FROM analysis_logs ORDER BY created_at`].map(
      (row) => ({
        id: String(row.id),
        runId: String(row.run_id),
        stage: String(row.stage),
        message: String(row.message),
        createdAt: String(row.created_at),
      })
    );
    const mdRow = [
      ...this.sql<DbRow>`SELECT markdown FROM converted_markdown ORDER BY updated_at DESC LIMIT 1`,
    ][0];
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
      this.recordRunStage(workflowId, value.generation, value.stage as IngestionRunStatus);
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
    if (value?.searchReady)
      this.updateIndexState(workflowId, run.generation, { status: "completed" });
  }

  async onWorkflowError(_workflowName: string, workflowId: string, error: string): Promise<void> {
    this.failRun(workflowId, error, classifyRetry(error));
  }

  async onWorkflowEvent(_workflowName: string, workflowId: string, event: unknown): Promise<void> {
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
    if (!this.env.KNOWLEDGE_SEARCH) {
      this.sql`UPDATE sources SET status='searchable',search_ready=1,indexing_status='completed'
        WHERE artifact_ready=1 AND (search_ready=0 OR status!='searchable')`;
      this
        .sql`UPDATE ingestion_runs SET status='searchable',search_ready=1,indexing_status='completed',completed_at=COALESCE(completed_at, ${now()})
        WHERE artifact_ready=1 AND status NOT IN ('searchable', 'unchanged', 'failed_retryable', 'failed_permanent', 'cancelled', 'superseded')`;
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    this
      .sql`UPDATE ingestion_runs SET status='failed_permanent',error=COALESCE(error, 'Workflow timed out or completed'),completed_at=COALESCE(completed_at, ${now()})
      WHERE status NOT IN ('searchable', 'unchanged', 'failed_retryable', 'failed_permanent', 'cancelled', 'superseded')
      AND created_at < ${fiveMinutesAgo}`;
    this.sql`UPDATE sources SET status='failed',error=COALESCE(error, 'Processing timed out')
      WHERE status IN ('accepted', 'running') AND created_at < ${fiveMinutesAgo}`;

    if (this.env.KNOWLEDGE_SEARCH) {
      const pending = this.sources().filter(
        (source) => source.artifactReady && !source.searchReady
      );
      for (const source of pending.slice(0, 10)) {
        if (!source.activeRunId) continue;
        const key = `${userPrefix(this.name)}sources/${source.id}.md`;
        const result = await this.env.KNOWLEDGE_SEARCH.items.list({ key, per_page: 1 });
        this.updateIndexState(source.activeRunId, source.generation, result.result[0]);
      }
    }
    return this.status();
  }
}

export async function handleKnowledgeRequest(
  request: Request,
  env: Env,
  options?: { trustedInternal?: boolean }
): Promise<Response> {
  if (
    !options?.trustedInternal &&
    !verifyInternalSecret(request.headers.get("x-internal-secret"), env.INTERNAL_SERVICE_KEY)
  ) {
    return json(
      {
        error:
          "Forbidden: Direct public access is disabled. Requests must originate internally from Resume Builder.",
      },
      403
    );
  }

  const url = new URL(request.url);
  const match = url.pathname.match(/^\/users\/([^/]+)(\/.*)?$/);
  if (!match) return json({ error: "Not found" }, 404);
  const userId = decodeURIComponent(match[1]);
  if (!userId || userId.length > 200) return json({ error: "Invalid user" }, 400);

  const path = match[2] || "/status";

  // Dedicated per-source WebSocket: /users/:userId/sources/:sourceId/ws
  const sourceWsMatch = path.match(/^\/sources\/([^/]+)\/ws$/);
  if (sourceWsMatch && (request.headers.get("Upgrade") === "websocket" || path.endsWith("/ws"))) {
    const sourceStub = await getAgentByName(
      env.KnowledgeAgent,
      `source:${userId}:${sourceWsMatch[1]}`
    );
    return sourceStub.fetch(request);
  }

  // Dedicated per-source analysis REST endpoint: /users/:userId/sources/:sourceId/analysis
  const sourceAnalysisMatch = path.match(/^\/sources\/([^/]+)\/analysis$/);
  if (sourceAnalysisMatch && request.method === "GET") {
    const sourceStub = await getAgentByName(
      env.KnowledgeAgent,
      `source:${userId}:${sourceAnalysisMatch[1]}`
    );
    return json(await sourceStub.getSourceAnalysis());
  }

  const stub = await getAgentByName(env.KnowledgeAgent, userId);
  if (request.headers.get("Upgrade") === "websocket" || path === "/ws") {
    return stub.fetch(request);
  }
  try {
    if (path === "/sources" && request.method === "GET") return json(await stub.listSources());
    const idempotencyKey = request.headers.get("x-idempotency-key") || "";
    if (path === "/sources" && request.method === "POST")
      return json(await stub.addSource((await request.json()) as SourceInput, idempotencyKey), 202);
    if (path === "/status" && request.method === "GET") return json(await stub.reconcileSearch());
    if (path === "/query" && request.method === "POST")
      return json(
        await stub.queryKnowledge(
          String(((await request.json()) as { query?: unknown }).query || "")
        )
      );
    if (path === "/resumes/sync" && request.method === "POST")
      return json(await stub.syncResume(validateResumeReference(await request.json())));
    if (path === "/chat" && request.method === "POST")
      return json(
        await stub.chat(String(((await request.json()) as { message?: unknown }).message || ""))
      );
    if (path === "/documents" && request.method === "GET")
      return json(await stub.getDocument(url.searchParams.get("path") || "manifest.json"));
    const resumeRoute = path.match(/^\/resumes\/([^/]+)$/);
    if (resumeRoute && request.method === "DELETE")
      return json({ deleted: await stub.deleteResume(resumeRoute[1]) });
    const sourceRoute = path.match(/^\/sources\/([^/]+)(?:\/(refresh))?$/);
    if (sourceRoute && request.method === "DELETE")
      return json({ deleted: await stub.deleteSource(sourceRoute[1]) });
    if (sourceRoute?.[2] && request.method === "POST")
      return json(await stub.refreshSource(sourceRoute[1], idempotencyKey), 202);
    const runRoute = path.match(/^\/runs\/([^/]+)(?:\/(retry|cancel))?$/);
    if (runRoute && request.method === "GET" && !runRoute[2])
      return json(await stub.inspectRun(runRoute[1]));
    if (runRoute?.[2] === "retry" && request.method === "POST")
      return json(await stub.retryRun(runRoute[1], idempotencyKey), 202);
    if (runRoute?.[2] === "cancel" && request.method === "POST")
      return json(await stub.cancelRun(runRoute[1]));
    return json({ error: "Not found" }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Request failed" }, 400);
  }
}

export default {
  fetch: (request: Request, env: Env) => handleKnowledgeRequest(request, env),
} satisfies ExportedHandler<Env>;

