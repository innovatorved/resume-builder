import { describe, expect, test } from "bun:test";
import {
  canPublish,
  classifyRetry,
  searchStatus,
  terminalRunStatuses,
} from "../workflow-state";
import type { SourceRecord } from "../types";

describe("workflow state & generation fencing", () => {
  const baseSource: SourceRecord = {
    id: "src-1",
    type: "github",
    url: "https://github.com/example/repo",
    status: "running",
    createdAt: "2026-09-11T00:00:00.000Z",
    generation: 2,
    activeRunId: "run-2",
    artifactReady: false,
    searchReady: false,
  };

  test("canPublish allows write only when generation and activeRunId match exactly", () => {
    expect(canPublish(baseSource, "run-2", 2)).toBe(true);
  });

  test("canPublish blocks write from older generation (generation fencing)", () => {
    expect(canPublish(baseSource, "run-1", 1)).toBe(false);
  });

  test("canPublish blocks write from superseded run ID", () => {
    expect(canPublish(baseSource, "run-old", 2)).toBe(false);
  });

  test("canPublish blocks write if source was deleted (undefined)", () => {
    expect(canPublish(undefined, "run-2", 2)).toBe(false);
  });

  test("canPublish blocks write if source generation moved ahead", () => {
    const refreshedSource: SourceRecord = {
      ...baseSource,
      generation: 3,
      activeRunId: "run-3",
    };
    expect(canPublish(refreshedSource, "run-2", 2)).toBe(false);
  });
});

describe("retry classification", () => {
  test("classifies transient HTTP errors as retryable", () => {
    expect(classifyRetry(new Error("Request failed (408)"))).toBe("retryable");
    expect(classifyRetry(new Error("Rate limit exceeded (429)"))).toBe("retryable");
    expect(classifyRetry(new Error("Internal server error (500)"))).toBe("retryable");
    expect(classifyRetry(new Error("Bad gateway (502)"))).toBe("retryable");
    expect(classifyRetry(new Error("Service unavailable (503)"))).toBe("retryable");
    expect(classifyRetry(new Error("Gateway timeout (504)"))).toBe("retryable");
  });

  test("classifies permanent client errors as permanent", () => {
    expect(classifyRetry(new Error("Bad request (400)"))).toBe("permanent");
    expect(classifyRetry(new Error("Unauthorized (401)"))).toBe("permanent");
    expect(classifyRetry(new Error("Forbidden (403)"))).toBe("permanent");
    expect(classifyRetry(new Error("Not found (404)"))).toBe("permanent");
  });

  test("classifies content validation and size errors as permanent", () => {
    expect(classifyRetry(new Error("Source returned no content"))).toBe("permanent");
    expect(classifyRetry(new Error("Source is too large"))).toBe("permanent");
    expect(classifyRetry(new Error("Invalid URL format"))).toBe("permanent");
    expect(classifyRetry(new Error("Unsupported media type"))).toBe("permanent");
  });
});

describe("AI Search readiness separation", () => {
  test("returns queued state when item is missing or pending", () => {
    expect(searchStatus(undefined)).toEqual({
      searchReady: false,
      indexingStatus: "queued",
    });
    expect(searchStatus({ status: "in_progress" })).toEqual({
      searchReady: false,
      indexingStatus: "in_progress",
    });
  });

  test("returns searchReady true only when AI search status is completed", () => {
    expect(searchStatus({ status: "completed" })).toEqual({
      searchReady: true,
      indexingStatus: "completed",
    });
  });

  test("returns error state on search indexing failure", () => {
    const failed = searchStatus({ status: "error", error: "Quota exceeded" });
    expect(failed.searchReady).toBe(false);
    expect(failed.indexingStatus).toBe("error");
    expect(failed.error).toBe("Quota exceeded");
  });
});

describe("terminal run statuses", () => {
  test("recognizes all terminal run states", () => {
    expect(terminalRunStatuses.has("searchable")).toBe(true);
    expect(terminalRunStatuses.has("unchanged")).toBe(true);
    expect(terminalRunStatuses.has("failed_retryable")).toBe(true);
    expect(terminalRunStatuses.has("failed_permanent")).toBe(true);
    expect(terminalRunStatuses.has("cancelled")).toBe(true);
    expect(terminalRunStatuses.has("superseded")).toBe(true);
    expect(terminalRunStatuses.has("fetching")).toBe(false);
    expect(terminalRunStatuses.has("indexing")).toBe(false);
    expect(terminalRunStatuses.has("publishing")).toBe(false);
  });
});
