import { ChevronDown, Code2, Compass, Download, Eye, FileCode, History, Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ResumeMark } from "@/components/brand-lockup";
import { InstructionTourDialog } from "@/components/instruction-tour-dialog";
import { Button } from "@/components/ui/button";
import { VLogo } from "@/components/v-logo";
import { useToast } from "@/hooks/use-toast";
import { generateCleanModern } from "@/lib/templates";
import { type CompileResult, latexCompiler } from "@/lib/wasm/compiler-bridge";
import type { ResumeData } from "@/types/resume";
import { MonacoLatexEditor } from "./monaco-latex-editor";
import { PdfPreviewPane } from "./pdf-preview-pane";
import { PrismAiBar } from "./prism-ai-bar";
import { VersionHistoryModal, type VersionItem } from "./version-history-modal";

interface LatexEditorSplitProps {
  initialResume: {
    id: string;
    name: string;
    data: ResumeData;
    templateId?: string | null;
    currentVersionId?: string | null;
    rawLatex?: string | null;
  };
}

export function LatexEditorSplit({ initialResume }: LatexEditorSplitProps) {
  const { toast } = useToast();

  const [resumeName, setResumeName] = useState(initialResume.name || "Untitled Resume");
  const [structuredData, setStructuredData] = useState<ResumeData>(initialResume.data);
  const [currentVersionId, setCurrentVersionId] = useState<string | undefined>(
    initialResume.currentVersionId || undefined
  );

  // LaTeX source string - prefers loaded rawLatex from database version snapshot
  const [latexSource, setLatexSource] = useState(() => {
    return initialResume.rawLatex || generateCleanModern(initialResume.data);
  });

  // Compilation state
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileError, setCompileError] = useState<string | undefined>(undefined);
  const [compileDurationMs, setCompileDurationMs] = useState<number | undefined>(undefined);

  // Layout states
  const [splitRatio, setSplitRatio] = useState<number>(50); // percentage for left editor pane
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);
  const [showTourModal, setShowTourModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  const isResizingRef = useRef<boolean>(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latexSourceRef = useRef(latexSource);

  useEffect(() => {
    latexSourceRef.current = latexSource;
  }, [latexSource]);

  // Debounced auto-save function to persist drafts in real time
  const triggerAutoSave = useCallback(
    (newSource: string, newData: ResumeData, newName: string) => {
      setAutoSaveStatus("unsaved");
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

      autoSaveTimerRef.current = setTimeout(async () => {
        setAutoSaveStatus("saving");
        try {
          const response = await fetch(`/api/resumes/${initialResume.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: initialResume.id,
              name: newName.trim() || initialResume.name,
              data: newData,
              rawLatex: newSource,
            }),
          });
          if (response.ok) {
            setAutoSaveStatus("saved");
          } else {
            const errBody = await response.json().catch(() => ({}));
            console.warn("[AutoSave] Server error:", response.status, errBody);
            setAutoSaveStatus("unsaved");
          }
        } catch (err) {
          console.warn("[AutoSave] Failed to save draft:", err);
          setAutoSaveStatus("unsaved");
        }
      }, 1500);
    },
    [initialResume.id, initialResume.name]
  );

  // Trigger compilation whenever latexSource changes
  const runCompile = useCallback((source: string) => {
    setIsCompiling(true);
    setCompileError(undefined);

    latexCompiler.debounceCompile(source, (result: CompileResult) => {
      setIsCompiling(false);
      setCompileDurationMs(result.durationMs);

      if (result.success && result.pdfData) {
        setPdfData(result.pdfData);
        setCompileError(undefined);
      } else {
        setCompileError(result.error || result.log || "Compilation failed");
      }
    });
  }, []);

  // Compile on mount
  useEffect(() => {
    runCompile(latexSource);
  }, [runCompile, latexSource]);

  // Handle Monaco code edit
  const handleLatexChange = (newCode: string) => {
    setLatexSource(newCode);
    runCompile(newCode);
    triggerAutoSave(newCode, structuredData, resumeName);
  };

  // Handle AI Copilot directly modifying the LaTeX source
  const handleApplyAiLatex = (newLatex: string, summary: string) => {
    setLatexSource(newLatex);
    runCompile(newLatex);
    triggerAutoSave(newLatex, structuredData, resumeName);

    toast({
      title: "AI Changes Applied",
    });
  };

  // Restore past version from modal
  const handleRestoreVersion = (ver: VersionItem) => {
    if (ver.structuredData) {
      setStructuredData(ver.structuredData as unknown as ResumeData);
    }
    if (ver.rawLatex) {
      setLatexSource(ver.rawLatex);
      runCompile(ver.rawLatex);
    } else if (ver.structuredData) {
      const generated = generateCleanModern(ver.structuredData as unknown as ResumeData);
      setLatexSource(generated);
      runCompile(generated);
    }
    setCurrentVersionId(ver.id);

    toast({
      title: `Restored Version ${ver.versionNumber}`,
      description: ver.changeSummary || "Resume restored to previous version.",
    });
  };

  // Save Version
  const handleSaveVersion = async (summary?: string) => {
    setIsSaving(true);

    try {
      if (!pdfData) {
        throw new Error("Wait for the resume to compile successfully before saving.");
      }

      const versionTempId = crypto.randomUUID();
      const uploadToR2 = async (
        type: "source" | "pdf",
        contentType: string,
        extension: string,
        body: BodyInit
      ) => {
        const signResponse = await fetch("/api/files/sign-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeId: initialResume.id,
            versionId: versionTempId,
            type,
            contentType,
            extension,
          }),
        });

        const signData = (await signResponse.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
          data?: { uploadUrl: string; key: string };
        };
        if (!signResponse.ok || !signData.success || !signData.data?.uploadUrl) {
          throw new Error(signData.error || `Failed to prepare ${type} upload.`);
        }

        const uploadResponse = await fetch(signData.data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body,
        });
        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${type} to Cloudflare R2.`);
        }

        return signData.data.key as string;
      };

      const source = latexSourceRef.current;
      const sourceKey = await uploadToR2("source", "application/x-latex", "tex", source);
      const pdfKey = await uploadToR2(
        "pdf",
        "application/pdf",
        "pdf",
        new Blob([pdfData as BlobPart], { type: "application/pdf" })
      );

      // Commit only after both R2 objects exist.
      const versionRes = await fetch("/api/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: initialResume.id,
          sourceKey,
          pdfKey,
          structuredData,
          rawLatex: source,
          isLatexCustom: true,
          changeSummary: summary || `Saved at ${new Date().toLocaleTimeString()}`,
        }),
      });

      const versionData = (await versionRes.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        data?: { id: string; versionNumber: number };
      };
      if (!versionRes.ok || !versionData.success || !versionData.data) {
        throw new Error(versionData.error || "Failed to record the saved version.");
      }

      // Also ensure resume title and draft are synced to the resume row
      await fetch(`/api/resumes/${initialResume.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialResume.id,
          name: resumeName.trim() || initialResume.name,
          data: structuredData,
          rawLatex: source,
        }),
      });

      setCurrentVersionId(versionData.data.id);
      toast({
        title: "Version Saved",
        description: `Version ${versionData.data.versionNumber} saved to version history.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Failed to save version.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Download PDF locally
  const handleDownloadPdf = () => {
    if (!pdfData) {
      toast({
        title: "No PDF compiled",
        description: "Please wait for LaTeX compilation to complete.",
        variant: "destructive",
      });
      return;
    }
    const blob = new Blob([pdfData as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resumeName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download .tex source locally
  const handleDownloadTex = () => {
    const blob = new Blob([latexSource], { type: "application/x-latex;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resumeName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}.tex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Resizer mouse drag handlers
  const handleMouseDown = () => {
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newRatio = (e.clientX / window.innerWidth) * 100;
      if (newRatio > 25 && newRatio < 75) {
        setSplitRatio(newRatio);
      }
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = "default";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-white font-sans selection:bg-neutral-800 selection:text-white">
      {/* TOP PRISM NAVIGATION BAR */}
      <header className="h-12 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between px-2.5 sm:px-3.5 z-20 select-none gap-2">
        {/* Left: Brand Badge + Back + Document Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <a
            href="/"
            className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 hover:border-neutral-700 text-white transition-colors shrink-0"
            title="Back to Dashboard"
          >
            <VLogo className="shrink-0 h-3.5 w-3.5 text-white" />
            <span className="text-neutral-500 font-mono text-[10px]">✕</span>
            <ResumeMark className="shrink-0 h-3.5 w-3.5 text-white" />
          </a>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-xs text-neutral-500 font-mono hidden sm:inline">resume /</span>
            <input
              type="text"
              value={resumeName}
              onChange={(e) => {
                const val = e.target.value;
                setResumeName(val);
                triggerAutoSave(latexSource, structuredData, val);
              }}
              className="bg-transparent hover:bg-neutral-900 focus:bg-neutral-900 text-xs sm:text-sm font-semibold tracking-tight text-white px-1.5 sm:px-2 py-1 rounded border border-transparent focus:border-neutral-700 outline-none transition-all w-28 sm:w-56 truncate"
              placeholder="Resume Title"
            />
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border border-neutral-800 bg-neutral-900">
              {autoSaveStatus === "saving" && (
                <span className="text-amber-400 animate-pulse">saving...</span>
              )}
              {autoSaveStatus === "saved" && <span className="text-emerald-400">saved</span>}
              {autoSaveStatus === "unsaved" && <span className="text-neutral-400">unsaved</span>}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Interactive Guide / Tour */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 sm:px-2.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 gap-1.5 rounded-md cursor-pointer border border-neutral-800/80"
            onClick={() => setShowTourModal(true)}
            title="App Walkthrough & How to Use"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Guide</span>
          </Button>

          {/* Version History Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 sm:px-3 text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 gap-1.5 rounded-md"
            onClick={() => setShowVersionModal(true)}
            title="Version History"
          >
            <History className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden md:inline">History</span>
          </Button>

          {/* Save Version Button */}
          <Button
            size="sm"
            className="h-8 px-2.5 sm:px-3 text-xs bg-white text-black hover:bg-neutral-200 font-medium rounded-md gap-1.5 shadow-xs transition-colors"
            disabled={isSaving}
            onClick={() => handleSaveVersion()}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">Save</span>
              </>
            )}
          </Button>

          {/* Export Dropdown */}
          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 sm:px-2.5 text-xs text-neutral-200 border-neutral-800 bg-neutral-900 hover:bg-neutral-800 gap-1 rounded-md"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </Button>

            <div className="absolute right-0 top-full mt-1 w-48 bg-neutral-950 border border-neutral-800 rounded-md shadow-2xl py-1 hidden group-hover:block z-30 animate-in fade-in-50">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="w-full text-left px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-900 flex items-center gap-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-neutral-400" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadTex}
                className="w-full text-left px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-900 flex items-center gap-2 transition-colors"
              >
                <FileCode className="w-3.5 h-3.5 text-neutral-400" />
                Download .tex Source
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE SEGMENTED VIEW SWITCHER (Only rendered on < md screens) */}
      <div className="flex md:hidden items-center justify-between px-2.5 py-1.5 bg-neutral-950 border-b border-neutral-800 z-10">
        <div className="flex items-center rounded-lg bg-neutral-900 p-0.5 border border-neutral-800 text-xs font-medium w-full">
          <button
            type="button"
            onClick={() => setMobileTab("editor")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
              mobileTab === "editor"
                ? "bg-neutral-800 text-white shadow-xs font-semibold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>LaTeX Source</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("preview")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
              mobileTab === "preview"
                ? "bg-neutral-800 text-white shadow-xs font-semibold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>PDF Preview</span>
            {isCompiling && <Loader2 className="w-3 h-3 animate-spin text-amber-400 ml-0.5" />}
          </button>
        </div>
      </div>

      {/* MAIN BODY: Mobile View (Tabbed) */}
      <div className="flex-1 flex overflow-hidden md:hidden relative pb-12">
        {mobileTab === "editor" ? (
          <div className="w-full h-full flex flex-col overflow-hidden bg-neutral-950">
            <MonacoLatexEditor value={latexSource} onChange={handleLatexChange} />
          </div>
        ) : (
          <div className="w-full h-full overflow-hidden bg-neutral-950">
            <PdfPreviewPane
              pdfData={pdfData}
              isCompiling={isCompiling}
              compileError={compileError}
              compileDurationMs={compileDurationMs}
              onRecompile={() => runCompile(latexSource)}
              onDownloadPdf={handleDownloadPdf}
              onDownloadTex={handleDownloadTex}
            />
          </div>
        )}
      </div>

      {/* MAIN BODY: Desktop View (Split Panes with Resizer) */}
      <div className="hidden md:flex flex-1 overflow-hidden relative pb-12">
        {/* Left Pane: Monaco Editor */}
        <div
          style={{ width: `${splitRatio}%` }}
          className="h-full flex flex-col border-r border-neutral-800 overflow-hidden bg-neutral-950"
        >
          <MonacoLatexEditor value={latexSource} onChange={handleLatexChange} />
        </div>

        {/* Resizer Divider */}
        <div
          aria-hidden="true"
          onMouseDown={handleMouseDown}
          className="w-1 bg-neutral-900 hover:bg-neutral-600 hover:w-1.5 cursor-col-resize transition-all z-10 select-none"
          title="Drag to resize panes"
        />

        {/* Right Pane: Vector PDF Preview */}
        <div className="flex-1 h-full overflow-hidden bg-neutral-950">
          <PdfPreviewPane
            pdfData={pdfData}
            isCompiling={isCompiling}
            compileError={compileError}
            compileDurationMs={compileDurationMs}
            onRecompile={() => runCompile(latexSource)}
            onDownloadPdf={handleDownloadPdf}
            onDownloadTex={handleDownloadTex}
          />
        </div>
      </div>

      {/* OPENAI PRISM-INSPIRED BOTTOM AI COPILOT DOCK */}
      <PrismAiBar
        currentLatex={latexSource}
        resumeId={initialResume.id}
        onApplyUpdatedLatex={handleApplyAiLatex}
        onSaveVersion={handleSaveVersion}
        hasCompileError={Boolean(compileError)}
      />

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={showVersionModal}
        onClose={() => setShowVersionModal(false)}
        resumeId={initialResume.id}
        currentVersionId={currentVersionId}
        onRestoreVersion={handleRestoreVersion}
      />

      {/* Interactive App Tour / Guide Modal */}
      <InstructionTourDialog
        open={showTourModal}
        onOpenChange={setShowTourModal}
      />
    </div>
  );
}
