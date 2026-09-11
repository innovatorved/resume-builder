import {
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  Sparkles,
  Terminal,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface PrismAiBarProps {
  currentLatex: string;
  resumeId: string;
  onApplyUpdatedLatex: (newLatex: string, summary: string) => void;
  onSaveVersion: (summary?: string) => Promise<void>;
  hasCompileError?: boolean;
}

interface TailorPreview {
  tailoredLatex: string;
  alignmentAnalysis: {
    matchedRequirements?: Array<{ requirement: string; evidence: string; citations?: string[] }>;
    missingRequirements?: string[];
    summaryOfChanges?: string;
  };
  citations?: Array<{ id: string; key: string }>;
}

const DEFAULT_CHIPS = [
  "Build standard resume from my knowledge",
  "Tailor to a target job post",
  "Highlight my certifications & skills",
  "Quantify bullets with Google XYZ formula",
  "Fix LaTeX syntax or balance braces",
];

export function PrismAiBar({
  currentLatex,
  resumeId,
  onApplyUpdatedLatex,
  onSaveVersion,
  hasCompileError = false,
}: PrismAiBarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>(DEFAULT_CHIPS);
  const [lastUndoLatex, setLastUndoLatex] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [showTailor, setShowTailor] = useState(false);
  const [tailorPreview, setTailorPreview] = useState<TailorPreview | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Focus prompt on Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto scroll chat to bottom when messages update
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages.length]);

  const handleSubmit = async (textToSubmit?: string) => {
    const query = (textToSubmit || prompt).trim();
    if (!query || isLoading) return;

    setPrompt("");
    setErrorMessage(null);
    setIsLoading(true);

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: query };
    const newMessages: Message[] = [...messages, userMsg];
    setMessages(newMessages);

    try {
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId,
          message: query,
          currentLatex,
          conversationHistory: newMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: {
          reply?: string;
          updatedLatex?: string;
          suggestedPrompts?: string[];
        };
      };

      if (data.success && data.data) {
        const payload = data.data;
        setLastUndoLatex(currentLatex);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: payload.reply || "Document updated.",
          },
        ]);

        if (payload.suggestedPrompts && payload.suggestedPrompts.length > 0) {
          setSuggestedPrompts(payload.suggestedPrompts);
        }

        // Apply updated LaTeX to editor & compile
        if (payload.updatedLatex) {
          onApplyUpdatedLatex(payload.updatedLatex, payload.reply || "Updated by AI");
        }
      } else {
        setErrorMessage(data.error || "Failed to update resume. Please try again.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error contacting AI service");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = () => {
    if (!lastUndoLatex) return;
    onApplyUpdatedLatex(lastUndoLatex, "Reverted AI changes");
    setLastUndoLatex(null);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", content: "Reverted previous change." },
    ]);
  };

  const handleTailor = async () => {
    const description = jobDescription.trim();
    if (!description || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    setTailorPreview(null);
    try {
      const response = await fetch("/api/ai/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, jobDescription: description, currentLatex }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: TailorPreview;
      };
      if (!response.ok || !result.success) throw new Error(result.error || "Tailoring failed.");
      if (!result.data) throw new Error("Tailoring returned no preview.");
      setTailorPreview(result.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Tailoring failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTailor = async () => {
    if (!tailorPreview?.tailoredLatex) return;
    const summary = tailorPreview.alignmentAnalysis.summaryOfChanges || "Applied tailored resume";
    setLastUndoLatex(currentLatex);
    onApplyUpdatedLatex(tailorPreview.tailoredLatex, summary);
    setTailorPreview(null);
    await onSaveVersion(summary);
  };

  return (
    <div className="border-t border-neutral-800 bg-neutral-950/98 backdrop-blur-md shadow-2xl flex flex-col z-30 transition-all font-sans max-h-[80vh] sm:max-h-[65vh] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-2.5 sm:px-3.5 py-1.5 border-b border-neutral-900 bg-neutral-900/40 text-xs shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="flex items-center gap-1.5 font-medium text-neutral-200 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
            <span className="tracking-tight font-semibold">AI Copilot</span>
          </div>

          {hasCompileError && (
            <button
              type="button"
              onClick={() =>
                handleSubmit("Fix the LaTeX syntax and compilation errors in this document")
              }
              className="ml-1 sm:ml-2 inline-flex items-center gap-1 text-[10px] sm:text-[11px] bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 sm:px-2 py-0.5 rounded hover:bg-red-500/20 transition-colors shrink-0"
            >
              <Wand2 className="w-3 h-3 text-red-400 shrink-0" />
              <span className="hidden sm:inline">Fix LaTeX Error</span>
              <span className="sm:hidden">Fix</span>
            </button>
          )}

          {lastUndoLatex && (
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-neutral-400 hover:text-white ml-1 sm:ml-2 transition-colors shrink-0"
            >
              <RotateCcw className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">Undo AI Edit</span>
              <span className="sm:hidden">Undo</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 bg-neutral-900 rounded border border-neutral-800">
            ⌘K
          </kbd>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition-colors ml-1"
            title={isOpen ? "Minimize AI panel" : "Expand AI panel"}
          >
            {isOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Conversation History */}
      {isOpen && messages.length > 0 && (
        <div className="max-h-48 overflow-y-auto p-3 space-y-2.5 text-xs border-b border-neutral-900">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0 text-neutral-300 mt-0.5">
                  <Sparkles className="w-3 h-3" />
                </div>
              )}
              <div
                className={`max-w-2xl px-3.5 py-2 rounded-lg leading-relaxed ${
                  m.role === "user"
                    ? "bg-white text-black font-medium shadow-sm"
                    : "bg-neutral-900 border border-neutral-800 text-neutral-200"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-neutral-400 text-xs italic">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              <span>Updating LaTeX resume...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Quick Action Suggestion Chips */}
      {isOpen && (
        <div className="px-3.5 pt-2 pb-1.5 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
          <span className="text-neutral-500 shrink-0 font-medium">Quick actions:</span>
          {suggestedPrompts.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={isLoading}
              onClick={() => {
                if (chip.toLowerCase().includes("tailor")) {
                  setShowTailor(true);
                } else {
                  handleSubmit(chip);
                }
              }}
              className="shrink-0 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{chip}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && showTailor && (
        <div className="border-t border-neutral-900 p-3 space-y-2 text-xs">
          <label htmlFor="job-description" className="block font-medium text-neutral-200">
            Paste the job description
          </label>
          <textarea
            id="job-description"
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            rows={4}
            maxLength={50000}
            disabled={isLoading}
            className="w-full resize-y rounded-md border border-neutral-800 bg-neutral-900 p-2 text-neutral-100 outline-none focus:border-neutral-600"
            placeholder="Include responsibilities and required qualifications."
          />
          <Button
            type="button"
            size="sm"
            disabled={isLoading || !jobDescription.trim()}
            onClick={handleTailor}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create preview"}
          </Button>
          {tailorPreview && (
            <div className="rounded-md border border-neutral-800 bg-neutral-900/70 p-3 space-y-3">
              <p className="text-neutral-200">
                {tailorPreview.alignmentAnalysis.summaryOfChanges || "Tailored draft ready."}
              </p>
              <div>
                <p className="mb-1 font-medium text-emerald-400">Matched requirements</p>
                <ul className="space-y-1 text-neutral-300">
                  {(tailorPreview.alignmentAnalysis.matchedRequirements || []).map((match) => (
                    <li key={match.requirement}>
                      {match.requirement} — {match.evidence}
                      {match.citations?.length ? ` [${match.citations.join(", ")}]` : ""}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 font-medium text-amber-400">Missing requirements</p>
                <ul className="space-y-1 text-neutral-300">
                  {(tailorPreview.alignmentAnalysis.missingRequirements || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              {tailorPreview.citations?.length ? (
                <p className="text-[11px] text-neutral-500">
                  Evidence:{" "}
                  {tailorPreview.citations
                    .map((citation) => `${citation.id} ${citation.key}`)
                    .join(" · ")}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={handleApplyTailor}>
                  Apply and save version
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setTailorPreview(null)}
                >
                  Discard
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Prompt Bar */}
      {isOpen && (
        <div className="p-2 sm:px-3 sm:pb-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 focus-within:border-neutral-600 rounded-lg px-3 py-1.5 shadow-inner transition-colors"
          >
            <button
              type="button"
              onClick={() => setShowTailor((value) => !value)}
              className="shrink-0 rounded px-1.5 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800 hover:text-white"
            >
              Tailor
            </button>
            <Terminal className="w-4 h-4 text-neutral-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              placeholder="Ask AI or request edits to your resume..."
              className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 outline-none min-w-0"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !prompt.trim()}
              className="h-7 w-7 rounded-md bg-white text-black hover:bg-neutral-200 dark:bg-white dark:text-black dark:hover:bg-neutral-200 shrink-0 shadow transition-colors disabled:opacity-30"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
              ) : (
                <ArrowUp className="w-3.5 h-3.5 text-black" />
              )}
            </Button>
          </form>

          {errorMessage && (
            <div className="mt-1.5 px-2 text-[11px] text-red-400 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-neutral-400 hover:text-white ml-2"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
