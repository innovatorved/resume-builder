"use client";

import {
  ArrowLeft,
  Ban,
  Bot,
  Briefcase,
  Check,
  ChevronRight,
  CircleAlert,
  Code2,
  Compass,
  Copy,
  FileText,
  Globe,
  History,
  Link2,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCw,
  Send,
  Sparkles,
  Terminal,
  Trash2,
  Upload,
} from "lucide-react";
import {
  type FormEventHandler,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AuthNav } from "@/components/auth-nav";
import { BrandLockup } from "@/components/brand-lockup";
import { InstructionTourDialog } from "@/components/instruction-tour-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { extractResumeText } from "@/lib/pdf/extract-text";
import { createResumeFromKnowledge } from "@/lib/actions/resume";

type SourceType = "github" | "portfolio" | "website" | "linkedin" | "resume" | "upload";
type SourceStatus =
  | "accepted"
  | "running"
  | "artifact_ready"
  | "searchable"
  | "unchanged"
  | "failed"
  | "cancelled"
  | "superseded";

type Source = {
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

type RunStatus =
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

type RunStep = {
  id: string;
  stage: RunStatus;
  attempt: number;
  detail?: string;
  createdAt: string;
};

type Run = {
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

type Citation = { key: string; score?: number; snippet?: string };
type ChatMessage = { id: string; role: "user" | "assistant"; text: string; citations?: Citation[] };

const sourceMeta: Record<SourceType, { label: string; icon: typeof Globe }> = {
  github: { label: "GitHub", icon: Code2 },
  portfolio: { label: "Portfolio", icon: Briefcase },
  website: { label: "Website", icon: Globe },
  linkedin: { label: "LinkedIn", icon: Link2 },
  resume: { label: "Resume", icon: FileText },
  upload: { label: "Upload", icon: Upload },
};

const terminalRuns = new Set<RunStatus>([
  "searchable",
  "unchanged",
  "failed_retryable",
  "failed_permanent",
  "cancelled",
  "superseded",
  "completed" as RunStatus,
]);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/knowledge/${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const result = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "Request failed");
  return result;
}

function formatDate(value?: string) {
  if (!value) return "Not refreshed yet";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}

function safeHref(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function inlineMarkdown(value: string, keyPrefix = "md"): ReactNode[] {
  const parts = value.split(/(\[[^\]]+\]\(https:\/\/[^)\s]+\)|`[^`\n]+`|\*\*[^*\n]+\*\*)/g);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      return href ? (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 decoration-neutral-500 hover:text-foreground"
        >
          {link[1]}
        </a>
      ) : (
        part
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={key}
          className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.9em] dark:bg-neutral-900"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push(
        <p
          key={`p-${blocks.length}`}
          className="leading-6 text-neutral-700 dark:text-neutral-300 my-1.5"
        >
          {inlineMarkdown(paragraph.join(" "))}
        </p>
      );
      paragraph = [];
    }
    if (list.length) {
      blocks.push(
        <ul
          key={`ul-${blocks.length}`}
          className="list-disc space-y-1.5 pl-5 text-neutral-700 dark:text-neutral-300 my-2"
        >
          {list.map((item) => (
            <li key={item}>{inlineMarkdown(item, `${blocks.length}-${item}`)}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        blocks.push(
          <pre
            key={`pre-${blocks.length}`}
            className="overflow-x-auto rounded-lg bg-neutral-100 dark:bg-neutral-900 p-3 font-mono text-xs text-neutral-800 dark:text-neutral-200 my-2.5"
          >
            {codeLines.join("\n")}
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        flush();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const item = line.match(/^[-*]\s+(.+)$/);
    const blockquote = line.match(/^>\s*(.+)$/);

    if (heading) {
      flush();
      const level = heading[1].length;
      blocks.push(
        level === 1 ? (
          <h1
            key={`h-${blocks.length}`}
            className="text-xl font-bold tracking-tight text-foreground mt-4 mb-2 pb-1 border-b border-border/60"
          >
            {inlineMarkdown(heading[2])}
          </h1>
        ) : level === 2 ? (
          <h2
            key={`h-${blocks.length}`}
            className="text-base font-semibold text-foreground mt-3 mb-1.5"
          >
            {inlineMarkdown(heading[2])}
          </h2>
        ) : (
          <h3
            key={`h-${blocks.length}`}
            className="text-sm font-semibold text-foreground mt-2 mb-1"
          >
            {inlineMarkdown(heading[2])}
          </h3>
        )
      );
    } else if (blockquote) {
      flush();
      blocks.push(
        <blockquote
          key={`bq-${blocks.length}`}
          className="border-l-2 border-indigo-500 pl-3 italic text-neutral-600 dark:text-neutral-400 my-2 text-xs leading-relaxed"
        >
          {inlineMarkdown(blockquote[1])}
        </blockquote>
      );
    } else if (item) {
      if (paragraph.length) flush();
      list.push(item[1]);
    } else if (!line.trim()) {
      flush();
    } else if (/^---+$/.test(line.trim())) {
      flush();
      blocks.push(<hr key={`hr-${blocks.length}`} className="border-border my-3" />);
    } else {
      if (list.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  if (inCodeBlock && codeLines.length) {
    blocks.push(
      <pre
        key={`pre-${blocks.length}`}
        className="overflow-x-auto rounded-lg bg-neutral-100 dark:bg-neutral-900 p-3 font-mono text-xs my-2.5"
      >
        {codeLines.join("\n")}
      </pre>
    );
  }
  return <div className="space-y-1.5 break-words text-xs sm:text-sm leading-relaxed">{blocks}</div>;
}

export function KnowledgePage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [sourceType, setSourceType] = useState<SourceType>("github");
  const [sourceUrl, setSourceUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [activeDocument, setActiveDocument] = useState<string>("profile.md");
  const [documentContent, setDocumentContent] = useState("");
  const [documentLoading, setDocumentLoading] = useState(false);
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showRunsView, setShowRunsView] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedRunForLogs, setSelectedRunForLogs] = useState<Run | null>(null);
  const [isExtractingResume, setIsExtractingResume] = useState(false);
  const [linkedInPdfFile, setLinkedInPdfFile] = useState<File | null>(null);
  const [resumeUploadFile, setResumeUploadFile] = useState<File | null>(null);
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Dedicated per-source Durable Object state & WebSocket
  const [activeInspectedSource, setActiveInspectedSource] = useState<Source | null>(null);
  const [sourceWsConnected, setSourceWsConnected] = useState(false);
  const [sourceAnalysisLogs, setSourceAnalysisLogs] = useState<
    Array<{ id: string; runId: string; stage: string; message: string; createdAt: string }>
  >([]);
  const [sourceConvertedMarkdown, setSourceConvertedMarkdown] = useState("");
  const [activeInspectorTab, setActiveInspectorTab] = useState<"analysis" | "markdown">("analysis");
  const [hasCopiedMarkdown, setHasCopiedMarkdown] = useState(false);
  const sourceWsRef = useRef<WebSocket | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const result = await request<{ sources: Source[]; runs: Run[] }>("status");
      setSources(result.sources || []);
      setRuns(result.runs || []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load knowledge");
    }
  }, []);

  const loadDocument = useCallback(async (path: string) => {
    setDocumentLoading(true);
    try {
      const result = await request<{ path: string; content: string } | null>(
        `documents?path=${encodeURIComponent(path)}`
      );
      setDocumentContent(result?.content || "");
    } catch (cause) {
      setDocumentContent("");
      setError(cause instanceof Error ? cause.message : "Could not load document");
    } finally {
      setDocumentLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    void loadDocument(activeDocument);
  }, [activeDocument, loadDocument]);

  // Only connect WebSocket stream when an agent run is active or currently being inspected
  const isStreamingNeeded = useMemo(() => {
    if (isAdding) return true;
    if (selectedRunForLogs && !terminalRuns.has(selectedRunForLogs.status)) return true;
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    return runs.some((r) => {
      if (terminalRuns.has(r.status)) return false;
      if (r.artifactReady && (r.indexingStatus === "completed" || !r.indexingStatus)) return false;
      const createdTime = new Date(r.createdAt).getTime();
      if (Number.isFinite(createdTime) && createdTime < tenMinutesAgo) return false;
      return true;
    });
  }, [isAdding, selectedRunForLogs, runs]);

  useEffect(() => {
    if (!isStreamingNeeded) return;
    const timer = window.setInterval(() => void loadStatus(), 2500);
    return () => window.clearInterval(timer);
  }, [isStreamingNeeded, loadStatus]);

  // Connect to Durable Object WebSocket strictly on-demand for active instances
  useEffect(() => {
    if (!isStreamingNeeded) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsConnected(false);
      return;
    }

    let unmounted = false;
    let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;

    function connectWs() {
      if (unmounted || !isStreamingNeeded) return;
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/api/knowledge/ws`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (unmounted) return;
          setWsConnected(true);
          if (selectedRunForLogs?.id) {
            ws.send(JSON.stringify({ type: "inspect_run", runId: selectedRunForLogs.id }));
          }
        };

        ws.onmessage = (event) => {
          if (unmounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === "init" || data.type === "status_update") {
              if (data.status) {
                setSources(data.status.sources || []);
                setRuns(data.status.runs || []);
              }
            } else if (data.type === "step_recorded") {
              setRuns((prev) =>
                prev.map((r) => {
                  if (r.id === data.runId) {
                    const existing = r.steps || [];
                    return { ...r, steps: [...existing, data.step] };
                  }
                  return r;
                })
              );
              setSelectedRunForLogs((prev) => {
                if (prev && prev.id === data.runId) {
                  const existing = prev.steps || [];
                  return { ...prev, steps: [...existing, data.step] };
                }
                return prev;
              });
            } else if (data.type === "run_stage_changed") {
              setRuns((prev) =>
                prev.map((r) => (r.id === data.runId ? { ...r, status: data.stage } : r))
              );
              setSelectedRunForLogs((prev) =>
                prev && prev.id === data.runId ? { ...prev, status: data.stage } : prev
              );
            } else if (data.type === "sources_updated") {
              if (data.status) {
                setSources(data.status.sources || []);
                setRuns(data.status.runs || []);
              } else {
                void loadStatus();
              }
            } else if (data.type === "run_details") {
              if (data.data?.run) {
                setSelectedRunForLogs(data.data.run);
              }
            } else if (data.type === "run_failed") {
              setRuns((prev) =>
                prev.map((r) =>
                  r.id === data.runId ? { ...r, status: data.status, error: data.message } : r
                )
              );
              setSelectedRunForLogs((prev) =>
                prev && prev.id === data.runId
                  ? { ...prev, status: data.status, error: data.message }
                  : prev
              );
              void loadStatus();
            } else if (data.type === "artifacts_published" || data.type === "index_state_updated") {
              void loadStatus();
            }
          } catch {
            // Silently ignore malformed frames
          }
        };

        ws.onclose = () => {
          if (unmounted) return;
          setWsConnected(false);
          if (isStreamingNeeded) {
            reconnectTimeout = setTimeout(connectWs, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (!unmounted && isStreamingNeeded) {
          reconnectTimeout = setTimeout(connectWs, 3000);
        }
      }
    }

    connectWs();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsConnected(false);
    };
  }, [isStreamingNeeded, loadStatus, selectedRunForLogs?.id]);

  // Dedicated per-source WebSocket connection to source:{userId}:{sourceId} DO
  useEffect(() => {
    if (!activeInspectedSource) {
      if (sourceWsRef.current) {
        sourceWsRef.current.close();
        sourceWsRef.current = null;
      }
      setSourceWsConnected(false);
      setSourceAnalysisLogs([]);
      setSourceConvertedMarkdown("");
      return;
    }

    let unmounted = false;

    // 1. Immediately prefetch historical logs & converted markdown from DO SQLite
    void request<{ logs: any[]; convertedMarkdown: string }>(
      `sources/${encodeURIComponent(activeInspectedSource.id)}/analysis`
    )
      .then((res) => {
        if (unmounted || !res) return;
        if (Array.isArray(res.logs) && res.logs.length > 0) {
          setSourceAnalysisLogs(res.logs);
        }
        if (res.convertedMarkdown) {
          setSourceConvertedMarkdown(res.convertedMarkdown);
        }
      })
      .catch(() => {
        // Best effort
      });

    // 2. Only connect WebSocket stream if the inspected source is actively processing
    const isSourceActive =
      activeInspectedSource.status === "accepted" || activeInspectedSource.status === "running";
    if (!isSourceActive) {
      if (sourceWsRef.current) {
        sourceWsRef.current.close();
        sourceWsRef.current = null;
      }
      setSourceWsConnected(false);
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const sourceWsUrl = `${protocol}//${window.location.host}/api/knowledge/sources/${encodeURIComponent(activeInspectedSource.id)}/ws`;
    const ws = new WebSocket(sourceWsUrl);
    sourceWsRef.current = ws;

    ws.onopen = () => {
      if (unmounted) return;
      setSourceWsConnected(true);
      ws.send(JSON.stringify({ type: "get_source_state" }));
    };

    ws.onmessage = (event) => {
      if (unmounted) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "source_agent_init" || data.type === "source_state") {
          if (Array.isArray(data.logs) && data.logs.length > 0) {
            setSourceAnalysisLogs(data.logs);
          }
          if (typeof data.convertedMarkdown === "string" && data.convertedMarkdown) {
            setSourceConvertedMarkdown(data.convertedMarkdown);
          }
        } else if (data.type === "agent_analysis") {
          setSourceAnalysisLogs((prev) => [
            ...prev,
            {
              id: data.id || `${Date.now()}`,
              runId: data.runId,
              stage: data.stage,
              message: data.message,
              createdAt: data.createdAt || new Date().toISOString(),
            },
          ]);

          const isTerminal = [
            "searchable",
            "completed",
            "unchanged",
            "failed_permanent",
            "failed_retryable",
            "cancelled",
            "superseded",
          ].includes(data.stage);

          if (isTerminal) {
            // Once workflow completes, cleanly close WebSocket after 1.5s grace period so final frames settle
            setTimeout(() => {
              if (unmounted) return;
              if (sourceWsRef.current) {
                sourceWsRef.current.close();
                sourceWsRef.current = null;
              }
              setSourceWsConnected(false);
              void loadStatus();
            }, 1500);
          }
        } else if (data.type === "markdown_converted") {
          if (typeof data.markdown === "string") {
            setSourceConvertedMarkdown(data.markdown);
          }
        }
      } catch {
        // Silently ignore malformed frames
      }
    };

    ws.onclose = () => {
      if (unmounted) return;
      setSourceWsConnected(false);
    };

    ws.onerror = () => {
      ws.close();
    };

    return () => {
      unmounted = true;
      if (sourceWsRef.current) {
        sourceWsRef.current.close();
        sourceWsRef.current = null;
      }
      setSourceWsConnected(false);
    };
  }, [activeInspectedSource?.id]);

  const documents = useMemo(() => {
    const list: Array<[string, string]> = [
      ["profile.md", "Full Profile"],
      ["manifest.json", "Manifest (JSON)"],
    ];
    for (const source of sources) {
      if (source.artifactReady) {
        list.push([
          `sources/${source.id}.md`,
          source.name || (source.url ? new URL(source.url).hostname : source.type),
        ]);
      }
    }
    return list;
  }, [sources]);

  const coverage = useMemo(() => {
    const total = sources.length;
    const ready = sources.filter((s) => s.artifactReady).length;
    const searchable = sources.filter((s) => s.searchReady).length;
    const gh = sources.filter((s) => s.type === "github" && s.artifactReady).length;
    const web = sources.filter(
      (s) => (s.type === "website" || s.type === "linkedin") && s.artifactReady
    ).length;
    const uploads = sources.filter(
      (s) => (s.type === "upload" || s.type === "resume") && s.artifactReady
    ).length;
    return {
      readiness: total > 0 ? Math.round((ready / total) * 100) : 0,
      searchIndex: total > 0 ? Math.round((searchable / total) * 100) : 0,
      github: gh > 0 ? Math.min(100, gh * 34) : 0,
      web: web > 0 ? Math.min(100, web * 25) : 0,
      uploads: uploads > 0 ? Math.min(100, uploads * 34) : 0,
    };
  }, [sources]);

  const addUrlSource: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (sourceType === "resume") {
      if (!resumeUploadFile) return;
      const fileToUpload = resumeUploadFile;
      setResumeUploadFile(null);
      await uploadFile(fileToUpload);
      return;
    }

    if (!sourceUrl.trim()) return;
    setIsAdding(true);
    try {
      let content: string | undefined;
      let name: string | undefined;
      let mimeType: string | undefined;

      if (sourceType === "linkedin" && linkedInPdfFile) {
        setIsExtractingResume(true);
        try {
          const extracted = await extractResumeText(linkedInPdfFile);
          content = extracted.text;
          name = linkedInPdfFile.name;
          mimeType = "text/markdown";
        } catch (err: any) {
          console.warn("Could not extract text from LinkedIn PDF:", err);
        } finally {
          setIsExtractingResume(false);
        }
      }

      const res = await request<{ source: Source; run: Run }>("sources", {
        method: "POST",
        headers: { "x-idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          type: sourceType,
          url: sourceUrl.trim(),
          name,
          content,
          mimeType,
        }),
      });
      setSourceUrl("");
      setLinkedInPdfFile(null);
      await loadStatus();
      if (res.source) {
        setActiveInspectedSource(res.source);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add source");
    } finally {
      setIsAdding(false);
    }
  };

  async function uploadFile(file?: File) {
    if (!file) return;
    setIsAdding(true);
    setIsExtractingResume(true);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("File must be 10 MB or smaller.");
      const extracted = await extractResumeText(file);
      const isResume =
        extracted.fileType === "pdf" ||
        extracted.fileType === "latex" ||
        file.name.toLowerCase().includes("resume") ||
        file.name.toLowerCase().includes("cv");

      const res = await request<{ source: Source; run: Run }>("sources", {
        method: "POST",
        headers: { "x-idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          type: isResume ? "resume" : "upload",
          name: file.name,
          content: extracted.text,
          mimeType: extracted.fileType === "latex" ? "text/plain" : "text/markdown",
        }),
      });
      await loadStatus();
      if (res.source) {
        setActiveInspectedSource(res.source);
      } else if (res.run) {
        setSelectedRunForLogs(res.run);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not upload file");
    } finally {
      setIsAdding(false);
      setIsExtractingResume(false);
    }
  }

  async function sourceAction(source: Source, action: "refresh" | "delete") {
    if (
      action === "delete" &&
      !window.confirm(`Delete ${source.name || source.url || "this source"}?`)
    ) {
      return;
    }
    setBusyId(source.id);
    try {
      await request(
        `sources/${encodeURIComponent(source.id)}${action === "refresh" ? "/refresh" : ""}`,
        {
          method: action === "refresh" ? "POST" : "DELETE",
          headers: action === "refresh" ? { "x-idempotency-key": crypto.randomUUID() } : undefined,
        }
      );
      await loadStatus();
      if (action === "delete") {
        setActiveDocument("profile.md");
        await loadDocument("profile.md");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not ${action} source`);
    } finally {
      setBusyId(null);
    }
  }

  async function runAction(run: Run, action: "retry" | "cancel") {
    setBusyId(run.id);
    try {
      await request(`runs/${run.id}/${action}`, {
        method: "POST",
        headers: action === "retry" ? { "x-idempotency-key": crypto.randomUUID() } : undefined,
      });
      await loadStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not ${action} run`);
    } finally {
      setBusyId(null);
    }
  }

  const sendMessage: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const command = text.match(/^\/refresh\s+github$/i);
      if (command) {
        const github = sources.filter((source) => source.type === "github");
        await Promise.all(
          github.map((source) =>
            request(`sources/${encodeURIComponent(source.id)}/refresh`, {
              method: "POST",
              headers: { "x-idempotency-key": crypto.randomUUID() },
            })
          )
        );
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: github.length
              ? `Refreshing ${github.length} GitHub source${github.length === 1 ? "" : "s"}.`
              : "No GitHub source is connected.",
          },
        ]);
        await loadStatus();
      } else {
        const result = await request<{ answer: string; citations: Citation[] }>("chat", {
          method: "POST",
          body: JSON.stringify({ message: text }),
        });
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: result.answer,
            citations: result.citations,
          },
        ]);
      }
    } catch (cause) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: cause instanceof Error ? cause.message : "The request failed.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCreateResumeFromKnowledge = async () => {
    setIsGeneratingResume(true);
    setError("");
    try {
      const result = await createResumeFromKnowledge();
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to create resume from knowledge.");
      }
      window.location.href = `/resume/${result.data.id}`;
    } catch (err: any) {
      setError(err.message || "Failed to generate resume from knowledge.");
      setIsGeneratingResume(false);
    }
  };

  const processingCount = sources.filter(
    (source) => source.status === "accepted" || source.status === "running"
  ).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <BrandLockup size="md" showTagline={false} />
            <span className="hidden h-4 w-px bg-border sm:block" />
            <span className="hidden text-xs font-medium text-muted-foreground sm:block">
              Knowledge Agent
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {isStreamingNeeded && (
              <div className="inline-flex items-center gap-1.5 rounded-full px-2 sm:px-2.5 py-1 text-[11px] font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Processing live...</span>
                <span className="sm:hidden">Live</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRunsView(!showRunsView)}
              className="h-8 px-2 sm:px-3 gap-1.5 text-xs"
              title="Toggle Run History"
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {showRunsView ? "Hide History" : "Run History"}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTourOpen(true)}
              className="h-8 px-2 sm:px-3 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              title="How this app works (Interactive Walkthrough)"
            >
              <Compass className="h-3.5 w-3.5 text-blue-400" />
              <span className="hidden sm:inline">How it works</span>
            </Button>
            <Button variant="ghost" size="sm" asChild className="h-8 px-2 sm:px-3 gap-1.5 text-xs">
              <a href="/">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </a>
            </Button>
            <button
              type="button"
              onClick={handleCreateResumeFromKnowledge}
              disabled={isGeneratingResume}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border hover:decoration-foreground cursor-pointer disabled:opacity-50"
              title="Build ATS Resume from Knowledge"
            >
              {isGeneratingResume ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>{isGeneratingResume ? "Building..." : "Build Resume"}</span>
            </button>
            <AuthNav />
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <section className="mb-8 grid gap-6 border-b border-border/70 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Personal Knowledge Base
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Your Evidence Library
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Turn public work, repositories, and uploaded documents into durable, verified facts
              accessible to the AI resume tailor.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2.5">
            <button
              type="button"
              onClick={handleCreateResumeFromKnowledge}
              disabled={isGeneratingResume}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border hover:decoration-foreground cursor-pointer disabled:opacity-50"
            >
              {isGeneratingResume ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>{isGeneratingResume ? "Building..." : "Build Resume"}</span>
            </button>
            <div className="font-mono text-[11px] text-muted-foreground">
              {sources.length} source{sources.length === 1 ? "" : "s"} ·{" "}
              {processingCount ? `${processingCount} processing` : "up to date"}
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button
              type="button"
              className="ml-auto underline underline-offset-2"
              onClick={() => setError("")}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Run history view toggle */}
        {showRunsView && (
          <section className="mb-8 rounded-xl border border-border bg-neutral-50/50 p-4 dark:bg-neutral-950/50">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Ingestion Runs & Durable Steps</h2>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {runs.length} recent run{runs.length === 1 ? "" : "s"}
              </span>
            </div>
            {runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No ingestion runs recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {runs.map((run) => {
                  const matchingSource = sources.find((s) => s.id === run.sourceId);
                  const isRunning = !terminalRuns.has(run.status);
                  return (
                    <div
                      key={run.id}
                      className="rounded-lg border border-border bg-background p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {matchingSource?.name || matchingSource?.url || run.sourceId}
                          </span>
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-neutral-900">
                            Gen {run.generation}
                          </span>
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-neutral-900">
                            Attempt {run.attempt}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedRunForLogs(run)}
                            title="View live execution progress & logs"
                          >
                            <Terminal className="h-3 w-3" /> Live Logs
                          </Button>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              run.status === "searchable"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : run.status === "unchanged"
                                  ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                                  : run.status.startsWith("failed")
                                    ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                    : run.status === "cancelled" || run.status === "superseded"
                                      ? "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {run.status}
                          </span>
                          {isRunning && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 gap-1 px-2 text-[10px]"
                              disabled={busyId === run.id}
                              onClick={() => void runAction(run, "cancel")}
                            >
                              <Ban className="h-3 w-3" /> Cancel
                            </Button>
                          )}
                          {run.status === "failed_retryable" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 gap-1 px-2 text-[10px]"
                              disabled={busyId === run.id}
                              onClick={() => void runAction(run, "retry")}
                            >
                              <RotateCw className="h-3 w-3" /> Retry
                            </Button>
                          )}
                        </div>
                      </div>
                      {run.steps && run.steps.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
                          {run.steps.map((step) => (
                            <span
                              key={step.id}
                              className="inline-flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground dark:bg-neutral-900"
                            >
                              <Check className="h-2.5 w-2.5 text-emerald-600" />
                              {step.stage}
                            </span>
                          ))}
                        </div>
                      )}
                      {run.error && (
                        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{run.error}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <div className="min-w-0 space-y-10">
            <section aria-labelledby="sources-heading">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 id="sources-heading" className="text-lg font-semibold">
                    Sources
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add only information you want included in your private knowledge base.
                  </p>
                </div>
              </div>

              <form
                onSubmit={addUrlSource}
                className="mb-4 rounded-xl border border-border bg-neutral-50 p-3 dark:bg-neutral-950"
              >
                <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
                  <label className="sr-only" htmlFor="source-type">
                    Source type
                  </label>
                  <select
                    id="source-type"
                    value={sourceType}
                    onChange={(event) => {
                      setSourceType(event.target.value as SourceType);
                      setResumeUploadFile(null);
                    }}
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="github">GitHub profile</option>
                    <option value="portfolio">Portfolio (multi-page & sitemap)</option>
                    <option value="website">Website (single page)</option>
                    <option value="linkedin">LinkedIn page</option>
                    <option value="resume">Resume / Document upload</option>
                  </select>

                  {sourceType === "resume" ? (
                    <label className="flex items-center justify-between h-9 px-3 rounded-md border border-input bg-background text-xs cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900 transition">
                      <span className="truncate text-muted-foreground font-normal">
                        {resumeUploadFile
                          ? resumeUploadFile.name
                          : "Choose PDF, LaTeX (.tex), Markdown or text file..."}
                      </span>
                      <Upload className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
                      <input
                        type="file"
                        accept=".pdf,.tex,.md,.txt,.json,application/pdf,text/plain,text/markdown"
                        className="sr-only"
                        disabled={isAdding || isExtractingResume}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setResumeUploadFile(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  ) : (
                    <>
                      <label className="sr-only" htmlFor="source-url">
                        Public HTTPS URL
                      </label>
                      <Input
                        id="source-url"
                        type="url"
                        inputMode="url"
                        required
                        value={sourceUrl}
                        onChange={(event) => setSourceUrl(event.target.value)}
                        placeholder={
                          sourceType === "github"
                            ? "https://github.com/username"
                            : sourceType === "portfolio"
                              ? "https://yourportfolio.dev"
                              : sourceType === "linkedin"
                                ? "https://www.linkedin.com/in/username"
                                : "https://example.com/article"
                        }
                        className="h-9 text-xs"
                      />
                    </>
                  )}

                  <Button
                    disabled={
                      isAdding ||
                      isExtractingResume ||
                      (sourceType === "resume" ? !resumeUploadFile : !sourceUrl.trim())
                    }
                    size="sm"
                    className="h-9 gap-1.5 px-4 text-xs"
                  >
                    {isAdding || isExtractingResume ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : sourceType === "resume" ? (
                      <Upload className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    {sourceType === "resume" ? "Upload resume" : "Add source"}
                  </Button>
                </div>

                {sourceType === "linkedin" && (
                  <div className="mt-3 rounded-lg border border-border bg-neutral-100/50 dark:bg-neutral-900/50 p-3 text-xs space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-neutral-200/80 dark:bg-neutral-800 text-foreground">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">
                          Extract & Upload 100% LinkedIn Data to Cloudflare R2 (Takes 5 seconds):
                        </p>
                        <ol className="mt-1 list-decimal ml-4 space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                          <li>
                            Open your profile on{" "}
                            <a
                              href={sourceUrl || "https://linkedin.com"}
                              target="_blank"
                              rel="noreferrer"
                              className="text-foreground underline underline-offset-2 hover:text-muted-foreground"
                            >
                              LinkedIn
                            </a>{" "}
                            in your browser.
                          </li>
                          <li>
                            In your profile header, click <strong>More (...)</strong> &rarr; select{" "}
                            <strong>Save to PDF</strong>.
                          </li>
                          <li>
                            Attach the downloaded PDF below &mdash; our agent extracts 100% of your
                            authentic job titles, dates, descriptions, recommendations, and skills,
                            combined with your verified profile footprint into Cloudflare R2!
                          </li>
                        </ol>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-background hover:bg-neutral-100 dark:hover:bg-neutral-800 text-foreground border border-border px-2.5 py-1.5 text-xs font-medium transition select-none shadow-xs">
                        <Upload className="h-3.5 w-3.5" />
                        <span>
                          {linkedInPdfFile
                            ? "Replace LinkedIn PDF"
                            : "Attach LinkedIn PDF (Save to PDF)"}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          className="sr-only"
                          disabled={isAdding || isExtractingResume}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setLinkedInPdfFile(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {linkedInPdfFile && (
                        <div className="flex items-center gap-1.5 rounded-md bg-background border border-border px-2.5 py-1 text-[11px] text-foreground">
                          <FileText className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="truncate max-w-[200px] font-medium">
                            {linkedInPdfFile.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({Math.round(linkedInPdfFile.size / 1024)} KB)
                          </span>
                          <button
                            type="button"
                            onClick={() => setLinkedInPdfFile(null)}
                            className="text-muted-foreground hover:text-red-500 ml-1 font-bold text-sm leading-none"
                            title="Remove attached PDF"
                          >
                            &times;
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    {sourceType === "resume"
                      ? "Uploads and extracts structured facts, work history, and skills from PDF, LaTeX (.tex), Markdown, or plain text."
                      : sourceType === "portfolio"
                        ? "Crawls sitemap.xml and key subpages (/about, /projects, /certifications) to assemble comprehensive career evidence."
                        : sourceType === "website"
                          ? "Fast single-page capture of specific articles, posts, or company pages."
                          : sourceType === "linkedin"
                            ? "Enter your profile URL and optionally attach your 'Save to PDF' export above for 100% full career data."
                            : "Extracts public repositories, stars, languages, and profile bio."}
                  </p>
                </div>
              </form>

              {sources.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
                  <Link2 className="mx-auto h-5 w-5 text-muted-foreground" />
                  <h3 className="mt-3 text-sm font-semibold">Connect your first source</h3>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                    Start with GitHub or upload a resume. Extracted documents appear below as
                    ingestion completes.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                  {sources.map((source, index) => {
                    const meta = sourceMeta[source.type];
                    const Icon = meta.icon;
                    const working = source.status === "accepted" || source.status === "running";
                    const activeRun = runs.find((r) => r.id === source.activeRunId);

                    return (
                      <article
                        key={source.id}
                        className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${index ? "border-t border-border" : ""}`}
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-neutral-50 dark:bg-neutral-950">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-sm font-medium">
                                {source.name || source.url || meta.label}
                              </h3>
                              <span className="rounded bg-neutral-100 px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground dark:bg-neutral-900">
                                v{source.generation}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  source.status === "failed"
                                    ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                    : working
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                      : source.searchReady
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                        : source.artifactReady
                                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                          : "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                                }`}
                              >
                                {working ? (
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                ) : source.status === "failed" ? (
                                  <CircleAlert className="h-2.5 w-2.5" />
                                ) : (
                                  <Check className="h-2.5 w-2.5" />
                                )}
                                {source.status === "unchanged"
                                  ? "Up to date"
                                  : source.searchReady
                                    ? "Search ready"
                                    : source.artifactReady
                                      ? "Artifact ready"
                                      : source.status}
                              </span>
                              {activeRun &&
                                activeRun.status &&
                                !terminalRuns.has(activeRun.status) && (
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    [{activeRun.status}]
                                  </span>
                                )}
                            </div>
                            <p className="mt-1 truncate text-[11px] text-muted-foreground">
                              {meta.label} · {formatDate(source.refreshedAt || source.createdAt)}
                            </p>
                            {source.error && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {source.error}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          {working && activeRun && !terminalRuns.has(activeRun.status) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={busyId === activeRun.id}
                              onClick={() => void runAction(activeRun, "cancel")}
                              className="h-8 gap-1 px-2 text-xs text-muted-foreground"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveInspectedSource(source)}
                            className="h-8 gap-1.5 px-2 text-xs font-medium text-neutral-600 hover:text-foreground dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900 border-0 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none active:outline-none select-none shadow-none"
                            title="Inspect Agent Analysis & Live Converted Markdown"
                          >
                            {working ? (
                              <>
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </span>
                                <span>Stream</span>
                              </>
                            ) : (
                              <>
                                <Terminal className="h-3.5 w-3.5 text-neutral-500" />
                                <span>Logs</span>
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busyId === source.id || working}
                            onClick={() => void sourceAction(source, "refresh")}
                            className="h-8 gap-1.5 text-xs"
                          >
                            <RefreshCw
                              className={`h-3.5 w-3.5 ${busyId === source.id ? "animate-spin" : ""}`}
                            />
                            Refresh
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busyId === source.id}
                            onClick={() => void sourceAction(source, "delete")}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                            aria-label={`Delete ${source.name || source.url || "source"}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section aria-labelledby="documents-heading">
              <div className="mb-4">
                <h2 id="documents-heading" className="text-lg font-semibold">
                  Generated documents
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Readable evidence files assembled from your sources.
                </p>
              </div>
              <div className="grid overflow-hidden rounded-xl border border-border lg:grid-cols-[220px_minmax(0,1fr)] shadow-xs">
                <nav
                  aria-label="Knowledge documents"
                  className="border-b border-border bg-neutral-50/70 p-2.5 dark:bg-neutral-950/70 lg:border-b-0 lg:border-r lg:h-[600px] lg:overflow-y-auto"
                >
                  <div className="flex gap-1 overflow-x-auto lg:block lg:space-y-1">
                    {documents.map(([path, label]) => (
                      <button
                        key={path}
                        type="button"
                        onClick={() => setActiveDocument(path)}
                        className={`flex w-full min-w-max items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          activeDocument === path
                            ? "bg-foreground font-medium text-background"
                            : "text-muted-foreground hover:bg-neutral-200 hover:text-foreground dark:hover:bg-neutral-900"
                        }`}
                      >
                        <span className="truncate">{label}</span>
                        <ChevronRight className="hidden h-3 w-3 shrink-0 lg:block" />
                      </button>
                    ))}
                  </div>
                </nav>
                <div className="flex flex-col h-[600px] min-h-[480px]">
                  {/* Document Header Toolbar */}
                  <div className="flex items-center justify-between border-b border-border/80 bg-neutral-50/50 dark:bg-neutral-950/50 px-4 py-2.5 text-xs shrink-0">
                    <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground truncate">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                      <span className="truncate font-medium text-foreground">{activeDocument}</span>
                      {documentContent && (
                        <span className="text-[10px] text-muted-foreground">
                          ({documentContent.length.toLocaleString()} chars)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {activeDocument === "profile.md" && (
                        <button
                          type="button"
                          onClick={handleCreateResumeFromKnowledge}
                          disabled={isGeneratingResume}
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border hover:decoration-foreground cursor-pointer disabled:opacity-50 mr-1"
                          title="Build ATS LaTeX Resume from profile"
                        >
                          {isGeneratingResume ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          <span>{isGeneratingResume ? "Building..." : "Build Resume"}</span>
                        </button>
                      )}
                      {documentContent && (
                        <Button
                          size="sm"
                          variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(documentContent);
                          setCopiedDoc(true);
                          setTimeout(() => setCopiedDoc(false), 2000);
                        }}
                        className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                      >
                        {copiedDoc ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>
                    )}
                    </div>
                  </div>
                  {/* Scrollable Markdown / Content Body */}
                  <div className="flex-1 overflow-y-auto p-5 sm:p-7">
                    {documentLoading ? (
                      <div className="space-y-3" role="status" aria-label="Loading document">
                        <div className="h-7 w-44 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
                        <div className="h-3 w-full animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
                        <div className="h-3 w-4/5 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
                      </div>
                    ) : documentContent ? (
                      activeDocument.endsWith(".json") ? (
                        <pre className="overflow-x-auto rounded-lg bg-neutral-100 p-4 font-mono text-xs dark:bg-neutral-900 whitespace-pre-wrap leading-relaxed">
                          {documentContent}
                        </pre>
                      ) : (
                        <div className="pr-1">
                          <Markdown content={documentContent} />
                        </div>
                      )
                    ) : (
                      <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <p className="mt-3 text-sm font-medium">No document yet</p>
                        <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                          Add a source and wait for ingestion to finish.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="min-w-0 space-y-8">
            <section aria-labelledby="coverage-heading">
              <div className="mb-4 flex items-center justify-between">
                <h2 id="coverage-heading" className="text-sm font-semibold">
                  Knowledge coverage
                </h2>
                <span className="font-mono text-[10px] text-muted-foreground">evidence volume</span>
              </div>
              <div className="space-y-4">
                {Object.entries(coverage).map(([category, value]) => (
                  <div key={category}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="capitalize text-neutral-700 dark:text-neutral-300">
                        {category.replace(/([A-Z])/g, " $1")}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">{value}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
                      <div
                        className="h-full rounded-full bg-foreground transition-[width] duration-200"
                        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section
              aria-labelledby="chat-heading"
              className="overflow-hidden rounded-xl border border-border"
            >
              <div className="flex items-center gap-3 border-b border-border bg-neutral-50 px-4 py-3 dark:bg-neutral-950">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h2 id="chat-heading" className="text-sm font-semibold">
                    Ask your knowledge
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    Answers include source citations.
                  </p>
                </div>
              </div>
              <div
                aria-live="polite"
                className="max-h-[460px] min-h-64 space-y-4 overflow-y-auto p-4"
              >
                {messages.length === 0 ? (
                  <div className="py-8 text-center">
                    <MessageSquare className="mx-auto h-5 w-5 text-muted-foreground" />
                    <p className="mt-3 text-xs text-muted-foreground">
                      Ask about projects, experience, or skills.
                    </p>
                    <button
                      type="button"
                      onClick={() => setChatInput("/refresh github")}
                      className="mt-3 rounded-md bg-neutral-100 px-2 py-1 font-mono text-[10px] hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-neutral-900 dark:hover:bg-neutral-800"
                    >
                      /refresh github
                    </button>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={message.role === "user" ? "ml-8" : "mr-4"}>
                      <div
                        className={`rounded-lg px-3.5 py-2.5 text-xs leading-relaxed ${
                          message.role === "user"
                            ? "bg-foreground text-background font-medium"
                            : "bg-neutral-100 text-foreground dark:bg-neutral-900"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <Markdown content={message.text} />
                        ) : (
                          message.text
                        )}
                      </div>
                      {message.citations?.length ? (
                        <div className="mt-2 space-y-1">
                          {message.citations.map((citation, citationIndex) => (
                            <button
                              key={`${message.id}-${citation.key}`}
                              type="button"
                              onClick={() => {
                                if (citation.key.endsWith("profile.md")) {
                                  setActiveDocument("profile.md");
                                } else if (citation.key.includes("sources/")) {
                                  const sourcePath = citation.key.slice(
                                    citation.key.indexOf("sources/")
                                  );
                                  setActiveDocument(sourcePath);
                                }
                              }}
                              className="block max-w-full truncate text-left font-mono text-[9px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                            >
                              [{citationIndex + 1}] {citation.key.replace(/^users\/[^/]+\//, "")}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="mr-4 flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2.5 text-xs text-muted-foreground dark:bg-neutral-900">
                    <Loader2 className="h-3 w-3 animate-spin" /> Searching cited documents
                  </div>
                )}
              </div>
              <form onSubmit={sendMessage} className="border-t border-border p-3">
                <label htmlFor="knowledge-message" className="sr-only">
                  Ask your knowledge base
                </label>
                <div className="flex items-end gap-2">
                  <Textarea
                    id="knowledge-message"
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="What evidence shows my backend experience?"
                    rows={2}
                    className="min-h-16 resize-none text-xs"
                  />
                  <Button
                    disabled={!chatInput.trim() || chatLoading}
                    size="sm"
                    className="h-9 w-9 shrink-0 p-0"
                    aria-label="Send message"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>
            </section>
          </aside>
        </div>

        {/* Live Run Logs Modal */}
        <Dialog
          open={!!selectedRunForLogs}
          onOpenChange={(open) => {
            if (!open) setSelectedRunForLogs(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
            <DialogHeader className="border-b border-border pb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-foreground" />
                  <DialogTitle className="text-base font-semibold">
                    Ingestion Run Execution Logs
                  </DialogTitle>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      selectedRunForLogs?.status === "searchable"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : selectedRunForLogs?.status === "unchanged"
                          ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                          : selectedRunForLogs?.status?.startsWith("failed")
                            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                            : selectedRunForLogs?.status === "cancelled" ||
                                selectedRunForLogs?.status === "superseded"
                              ? "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {selectedRunForLogs?.status}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono">
                <span>Run: {selectedRunForLogs?.id.slice(0, 8)}...</span>
                <span>•</span>
                <span>Gen {selectedRunForLogs?.generation}</span>
                <span>•</span>
                <span>Attempt {selectedRunForLogs?.attempt}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      wsConnected
                        ? "bg-emerald-500 animate-pulse"
                        : selectedRunForLogs?.status && terminalRuns.has(selectedRunForLogs.status)
                          ? "bg-neutral-500"
                          : "bg-amber-500 animate-pulse"
                    }`}
                  />
                  <span>
                    {wsConnected
                      ? "Live Streaming Active"
                      : selectedRunForLogs?.status && terminalRuns.has(selectedRunForLogs.status)
                        ? "Execution Complete"
                        : "Syncing..."}
                  </span>
                </span>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-60 max-h-96">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Step Execution Timeline
              </div>
              {selectedRunForLogs?.steps && selectedRunForLogs.steps.length > 0 ? (
                <div className="space-y-2">
                  {selectedRunForLogs.steps.map((step, idx) => (
                    <div
                      key={step.id || idx}
                      className="flex items-start gap-3 rounded-lg border border-border/60 bg-neutral-50/60 dark:bg-neutral-900/40 p-3 text-xs font-mono"
                    >
                      <div className="mt-0.5">
                        {step.stage === "searchable" || step.stage === "unchanged" ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : step.stage.startsWith("failed") ? (
                          <CircleAlert className="h-4 w-4 text-red-500" />
                        ) : (
                          <Check className="h-4 w-4 text-neutral-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground capitalize">
                            Stage: {step.stage}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(step.createdAt)}
                          </span>
                        </div>
                        {step.detail && (
                          <p className="text-[11px] text-neutral-600 dark:text-neutral-400 break-words font-sans">
                            {step.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-foreground" />
                  Workflow initializing... Step records will stream via WebSocket.
                </div>
              )}

              {selectedRunForLogs?.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CircleAlert className="h-3.5 w-3.5" />
                    <span>Execution Diagnostic</span>
                  </div>
                  <p className="text-[11px] font-mono break-words">{selectedRunForLogs.error}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-2">
                {selectedRunForLogs && !terminalRuns.has(selectedRunForLogs.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-red-600"
                    disabled={busyId === selectedRunForLogs.id}
                    onClick={async () => {
                      await runAction(selectedRunForLogs, "cancel");
                      setSelectedRunForLogs(null);
                    }}
                  >
                    <Ban className="h-3.5 w-3.5" /> Cancel Run
                  </Button>
                )}
                {selectedRunForLogs?.status === "failed_retryable" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    disabled={busyId === selectedRunForLogs.id}
                    onClick={async () => {
                      await runAction(selectedRunForLogs, "retry");
                      setSelectedRunForLogs(null);
                    }}
                  >
                    <RotateCw className="h-3.5 w-3.5" /> Retry Ingestion
                  </Button>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedRunForLogs(null)}
                className="h-8 text-xs"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dedicated Source Agent Inspector Modal (Cloudflare DO Hibernation Stream) */}
        <Dialog
          open={!!activeInspectedSource}
          onOpenChange={(open) => {
            if (!open) {
              setActiveInspectedSource(null);
            }
          }}
        >
          <DialogContent className="w-[96vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[90vh] flex flex-col p-6 bg-neutral-950 border-neutral-800 text-white shadow-2xl">
            <DialogHeader className="border-b border-neutral-800 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-semibold flex items-center gap-2">
                      <span>Source Agent:</span>
                      <span className="text-neutral-200 truncate max-w-sm sm:max-w-xl md:max-w-2xl">
                        {activeInspectedSource?.name ||
                          activeInspectedSource?.url ||
                          activeInspectedSource?.type}
                      </span>
                    </DialogTitle>
                    <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                      DO Binding: source:{activeInspectedSource?.id?.slice(0, 8)}... (
                      {sourceWsConnected ? "Active WebSocket" : "Hibernating"})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                      sourceWsConnected
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : activeInspectedSource?.status === "searchable"
                          ? "bg-neutral-900 text-emerald-400 border border-neutral-800"
                          : "bg-neutral-900 text-neutral-400 border border-neutral-800"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        sourceWsConnected
                          ? "bg-emerald-400 animate-pulse"
                          : activeInspectedSource?.status === "searchable"
                            ? "bg-emerald-500/60"
                            : "bg-neutral-500"
                      }`}
                    />
                    <span>
                      {sourceWsConnected
                        ? "DO WebSocket Active"
                        : activeInspectedSource?.status === "searchable"
                          ? "Completed (DO Hibernated)"
                          : activeInspectedSource?.status === "failed"
                            ? "Failed (DO Hibernated)"
                            : "Hibernating / Offline"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs between Agent Analysis and Converted Markdown */}
              <div className="flex items-center gap-1.5 mt-4 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveInspectorTab("analysis")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 border-0 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 select-none ${
                    activeInspectorTab === "analysis"
                      ? "bg-neutral-800 text-white shadow-xs"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                  }`}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Stream ({sourceAnalysisLogs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInspectorTab("markdown")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 border-0 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 select-none ${
                    activeInspectorTab === "markdown"
                      ? "bg-neutral-800 text-white shadow-xs"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Markdown ({sourceConvertedMarkdown ? "Ready" : "Synthesizing"})</span>
                </button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-4 min-h-[360px] max-h-[62vh]">
              {activeInspectorTab === "analysis" ? (
                <div className="space-y-2 font-mono text-xs">
                  {sourceAnalysisLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500 space-y-2">
                      <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                      <p>Connecting to source agent instance...</p>
                      <p className="text-[11px] text-neutral-600">
                        Waiting for live analysis thought frames.
                      </p>
                    </div>
                  ) : (
                    sourceAnalysisLogs.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80 text-[11px]"
                      >
                        <span className="text-neutral-500 shrink-0 select-none font-mono">
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-neutral-800 text-indigo-400 shrink-0">
                          {item.stage}
                        </span>
                        <span className="text-neutral-300 break-words flex-1 leading-relaxed">
                          {item.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-400">
                      Artifact: sources/{activeInspectedSource?.id}.md
                    </span>
                    {sourceConvertedMarkdown && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(sourceConvertedMarkdown);
                          setHasCopiedMarkdown(true);
                          setTimeout(() => setHasCopiedMarkdown(false), 2000);
                        }}
                        className="h-7 text-xs gap-1.5 border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white"
                      >
                        {hasCopiedMarkdown ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Markdown</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {sourceConvertedMarkdown ? (
                    <pre className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[52vh]">
                      {sourceConvertedMarkdown}
                    </pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500 space-y-2 border border-dashed border-neutral-800 rounded-xl">
                      <Code2 className="h-6 w-6 text-neutral-500" />
                      <p>Markdown artifact synthesis in progress...</p>
                      <p className="text-[11px] text-neutral-600">
                        The agent will push the converted file as soon as analysis is complete.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
              <div className="text-[11px] text-neutral-500 font-mono">
                {activeInspectedSource?.url ? (
                  <span className="truncate max-w-md sm:max-w-2xl inline-block">
                    Target: {activeInspectedSource.url}
                  </span>
                ) : (
                  <span>Direct Upload Ingestion</span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveInspectedSource(null)}
                className="h-8 text-xs border-neutral-700 hover:bg-neutral-900"
              >
                Close Inspector
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Interactive App Guide & Tour Dialog */}
        <InstructionTourDialog open={tourOpen} onOpenChange={setTourOpen} />
      </main>
    </div>
  );
}
