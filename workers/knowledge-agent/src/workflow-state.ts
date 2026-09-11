import type { IngestionRunStatus, SourceRecord } from "./types";

export const terminalRunStatuses = new Set<IngestionRunStatus>([
  "searchable",
  "unchanged",
  "failed_retryable",
  "failed_permanent",
  "cancelled",
  "superseded",
]);

export function canPublish(
  source: Pick<SourceRecord, "generation" | "activeRunId"> | undefined,
  runId: string,
  generation: number
) {
  return source?.activeRunId === runId && source.generation === generation;
}

export function classifyRetry(error: unknown): "retryable" | "permanent" {
  const message = error instanceof Error ? error.message : String(error);
  const status = Number(message.match(/\((\d{3})\)/)?.[1]);
  if (status === 408 || status === 429 || status >= 500) return "retryable";
  if (status >= 400) return "permanent";
  if (/invalid|unsupported|too large|no content|not found/i.test(message)) return "permanent";
  return "retryable";
}

export function searchStatus(
  item: { status?: string; error?: string } | undefined
): Pick<SourceRecord, "searchReady" | "indexingStatus" | "error"> {
  if (!item) return { searchReady: false, indexingStatus: "queued" };
  if (item.status === "completed") return { searchReady: true, indexingStatus: "completed" };
  if (item.status === "error" || item.status === "skipped") {
    return {
      searchReady: false,
      indexingStatus: item.status,
      error: item.error || `Indexing ${item.status}`,
    };
  }
  return { searchReady: false, indexingStatus: item.status || "queued" };
}
