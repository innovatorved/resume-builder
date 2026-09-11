export type SourceType = "github" | "portfolio" | "website" | "linkedin" | "resume" | "upload";
export type SourceStatus =
  | "accepted"
  | "running"
  | "artifact_ready"
  | "searchable"
  | "unchanged"
  | "failed"
  | "cancelled"
  | "superseded";
export type IngestionRunStatus =
  | "accepted"
  | "queued"
  | "fetching"
  | "validating"
  | "storing"
  | "publishing"
  | "indexing"
  | "searchable"
  | "unchanged"
  | "failed_retryable"
  | "failed_permanent"
  | "cancelled"
  | "superseded";
export type SourceInput = { type: SourceType; url?: string; name?: string; content?: string; mimeType?: string };
export type SourceRecord = SourceInput & {
  id: string;
  status: SourceStatus;
  createdAt: string;
  refreshedAt?: string;
  hash?: string;
  error?: string;
  generation: number;
  activeRunId?: string;
  artifactReady: boolean;
  searchReady: boolean;
  indexingStatus?: string;
};
export type IngestionStepRecord = {
  id: string;
  runId: string;
  stage: IngestionRunStatus;
  attempt: number;
  detail?: string;
  createdAt: string;
};
export type IngestionRunRecord = {
  id: string;
  workflowId?: string;
  sourceId: string;
  generation: number;
  attempt: number;
  idempotencyKey: string;
  status: IngestionRunStatus;
  artifactReady: boolean;
  searchReady: boolean;
  indexingStatus?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
  steps?: IngestionStepRecord[];
};
export type ResumeReference = { resumeId: string; versionId?: string; name: string; data: unknown; rawLatex?: string };
export type IngestionParams = {
  userId: string;
  source: SourceRecord;
  runId: string;
  generation: number;
};

export interface Env {
  KnowledgeAgent: DurableObjectNamespace<import("./index").KnowledgeAgent>;
  KNOWLEDGE_INGESTION: Workflow;
  KNOWLEDGE_BUCKET: R2Bucket;
  BROWSER: BrowserRun;
  KNOWLEDGE_SEARCH?: AiSearchInstance;
  GITHUB_TOKEN?: string;
  AI?: Ai;
  INTERNAL_SERVICE_KEY?: string;
}
