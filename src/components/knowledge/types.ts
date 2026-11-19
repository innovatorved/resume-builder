import { Briefcase, Code2, FileText, Globe, Link2, Upload } from "lucide-react";

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

export type Source = {
  id: string;
  type: SourceType;
  url?: string;
  name?: string;
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

export type RunStatus =
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

export type RunStep = {
  id: string;
  stage: RunStatus;
  attempt: number;
  detail?: string;
  createdAt: string;
};

export type Run = {
  id: string;
  sourceId: string;
  generation: number;
  attempt: number;
  status: RunStatus;
  artifactReady: boolean;
  searchReady: boolean;
  indexingStatus?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
  steps?: RunStep[];
};

export type Citation = { key: string; score?: number; snippet?: string };
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
};

export const sourceMeta: Record<SourceType, { label: string; icon: typeof Globe }> = {
  github: { label: "GitHub", icon: Code2 },
  portfolio: { label: "Portfolio", icon: Briefcase },
  website: { label: "Website", icon: Globe },
  linkedin: { label: "LinkedIn", icon: Link2 },
  resume: { label: "Resume", icon: FileText },
  upload: { label: "Upload", icon: Upload },
};

export const terminalRuns = new Set<RunStatus>([
  "searchable",
  "unchanged",
  "failed_retryable",
  "failed_permanent",
  "cancelled",
  "superseded",
  "completed" as RunStatus,
]);

export async function knowledgeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/knowledge/${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const result = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "Request failed");
  return result;
}

export function formatKnowledgeDate(value?: string) {
  if (!value) return "Not refreshed yet";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}
