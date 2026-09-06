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
  hasCompileError?: boolean;
}

const DEFAULT_CHIPS = [
  "Tailor to a target job post",
  "Quantify bullets with Google XYZ formula",
  "Make summary punchier & senior",
  "Fix LaTeX syntax or balance braces",
  "Highlight distributed systems & cloud architecture",
];

export function PrismAiBar({
  currentLatex,
  resumeId,
  onApplyUpdatedLatex,
  hasCompileError = false,
}: PrismAiBarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>(DEFAULT_CHIPS);
  const [lastUndoLatex, setLastUndoLatex] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      const data = await res.json();

      if (data.success && data.data) {
        setLastUndoLatex(currentLatex);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.data.reply || "Document updated.",
          },
        ]);

        if (data.data.suggestedPrompts?.length > 0) {
          setSuggestedPrompts(data.data.suggestedPrompts);
        }

        // Apply updated LaTeX to editor & compile
        if (data.data.updatedLatex) {
          onApplyUpdatedLatex(data.data.updatedLatex, data.data.reply || "Modified by Prism AI");
        }
      } else {
        setErrorMessage(data.error || "Failed to update resume. Please try again.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error contacting Prism AI");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = () => {
    if (!lastUndoLatex) return;
    onApplyUpdatedLatex(lastUndoLatex, "Reverted AI changes");
    setLastUndoLatex(null);
    setMessages((prev) => [...prev, { role: "assistant", content: "Reverted previous change." }]);
  };

  return (
    <div className="border-t border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-2xl flex flex-col z-30 transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-900 bg-slate-900/60 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-medium text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="tracking-wide">Prism AI Assistant</span>
          </div>

          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Directly refactors your LaTeX resume
          </span>

          {hasCompileError && (
            <button
              type="button"
              onClick={() =>
                handleSubmit("Fix the LaTeX syntax and compilation errors in this document")
              }
              className="ml-2 inline-flex items-center gap-1 text-[11px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded hover:bg-red-500/30 transition-colors"
            >
              <Wand2 className="w-3 h-3 text-red-400" />
              Fix LaTeX Error
            </button>
          )}

          {lastUndoLatex && (
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 ml-2"
            >
              <RotateCcw className="w-3 h-3" />
              Undo AI Edit
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
            ⌘K
          </kbd>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors ml-1"
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
        <div className="max-h-48 overflow-y-auto p-3 space-y-2.5 text-xs border-b border-slate-900/80">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center shrink-0 text-blue-400 mt-0.5">
                  <Sparkles className="w-3 h-3" />
                </div>
              )}
              <div
                className={`max-w-2xl px-3 py-2 rounded-lg leading-relaxed ${
                  m.role === "user"
                    ? "bg-blue-600 text-white shadow"
                    : "bg-slate-900 border border-slate-800 text-slate-200"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs italic">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span>Prism is rewriting and formatting LaTeX code...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Quick Action Suggestion Chips */}
      {isOpen && (
        <div className="px-3 pt-2 pb-1.5 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
          <span className="text-slate-500 shrink-0 font-medium">Quick actions:</span>
          {suggestedPrompts.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={isLoading}
              onClick={() => handleSubmit(chip)}
              className="shrink-0 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-full transition-all flex items-center gap-1"
            >
              <span>{chip}</span>
            </button>
          ))}
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
            className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 focus-within:border-blue-500/80 rounded-xl px-3 py-1.5 shadow-inner transition-colors"
          >
            <Terminal className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              placeholder="Ask Prism AI to edit, tailor to a job post, rewrite bullets, or fix LaTeX syntax..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !prompt.trim()}
              className="h-7 w-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shrink-0 shadow transition-all disabled:opacity-40"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowUp className="w-3.5 h-3.5" />
              )}
            </Button>
          </form>

          {errorMessage && (
            <div className="mt-1.5 px-2 text-[11px] text-red-400 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-slate-400 hover:text-white ml-2"
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
