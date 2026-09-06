import { ArrowLeft, ChevronDown, Code, Download, FileCode, FileText, History, Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandLockup, ResumeMark } from "@/components/brand-lockup";
import { Button } from "@/components/ui/button";
import { VLogo } from "@/components/v-logo";
import { useToast } from "@/hooks/use-toast";
import { generateCleanModern } from "@/lib/templates";
import { type CompileResult, latexCompiler } from "@/lib/wasm/compiler-bridge";
import type { ResumeData } from "@/types/resume";
import { MonacoLatexEditor } from "./monaco-latex-editor";
import { PdfPreviewPane } from "./pdf-preview-pane";
import { PrismAiBar } from "./prism-ai-bar";
import { StructuredFormEditor } from "./structured-form-editor";
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
  const [leftViewMode, setLeftViewMode] = useState<"code" | "form">("code");
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
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  const isResizingRef = useRef<boolean>(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save function to persist drafts in real time
  const triggerAutoSave = useCallback(
    (newSource: string, newData: ResumeData, newName: string) => {
      setAutoSaveStatus("unsaved");
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

      autoSaveTimerRef.current = setTimeout(async () => {
        setAutoSaveStatus("saving");
        try {
          await fetch(`/api/resumes/${initialResume.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: initialResume.id,
              name: newName.trim() || initialResume.name,
              data: newData,
              rawLatex: newSource,
            }),
          });
          setAutoSaveStatus("saved");
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

  // Update LaTeX when structured form data changes
  const handleFormDataChange = (newData: ResumeData) => {
    setStructuredData(newData);
    const newSource = generateCleanModern(newData);
    setLatexSource(newSource);
    runCompile(newSource);
    triggerAutoSave(newSource, newData, resumeName);
  };

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
      description: summary,
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
      const generated = generateCleanModern(
        ver.structuredData as unknown as ResumeData
      );
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
      const versionTempId = crypto.randomUUID();
      let sourceKey = `resumes/local/${initialResume.id}/source/${versionTempId}.tex`;
      let pdfKey: string | null = null;

      // 1. Attempt presigned R2 upload for source
      try {
        const signSourceRes = await fetch("/api/files/sign-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeId: initialResume.id,
            versionId: versionTempId,
            type: "source",
            contentType: "application/x-latex",
            extension: "tex",
          }),
        });

        const signSourceData = await signSourceRes.json();
        if (signSourceData.success && signSourceData.data?.uploadUrl) {
          sourceKey = signSourceData.data.key;
          await fetch(signSourceData.data.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/x-latex" },
            body: latexSource,
          });
        }
      } catch (uploadErr) {
        console.warn("[SaveVersion] Cloudflare R2 upload skipped (using DB record):", uploadErr);
      }

      // 2. Attempt presigned R2 upload for compiled PDF if available
      if (pdfData) {
        try {
          const signPdfRes = await fetch("/api/files/sign-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resumeId: initialResume.id,
              versionId: versionTempId,
              type: "pdf",
              contentType: "application/pdf",
              extension: "pdf",
            }),
          });

          const signPdfData = await signPdfRes.json();
          if (signPdfData.success && signPdfData.data?.uploadUrl) {
            pdfKey = signPdfData.data.key;
            await fetch(signPdfData.data.uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": "application/pdf" },
              body: pdfData,
            });
          }
        } catch (pdfUploadErr) {
          console.warn("[SaveVersion] Cloudflare R2 PDF upload skipped:", pdfUploadErr);
        }
      }

      // 3. Commit version to database
      const versionRes = await fetch("/api/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: initialResume.id,
          sourceKey,
          pdfKey,
          structuredData,
          rawLatex: latexSource,
          isLatexCustom: true,
          changeSummary: summary || `Saved at ${new Date().toLocaleTimeString()}`,
        }),
      });

      // Also ensure resume title and draft are synced to the resume row
      await fetch(`/api/resumes/${initialResume.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialResume.id,
          name: resumeName.trim() || initialResume.name,
          data: structuredData,
          rawLatex: latexSource,
        }),
      });

      const versionData = await versionRes.json();

      if (versionData.success) {
        setCurrentVersionId(versionData.data.id);
        toast({
          title: "Version Saved",
          description: `Version ${versionData.data.versionNumber} saved to version history.`,
        });
      } else {
        toast({
          title: "Saved Locally",
          description: versionData.error || "Updated in database.",
        });
      }
    } catch (err: unknown) {
      toast({
        title: "Save Notice",
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
      <header className="h-12 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between px-3.5 z-20 select-none">
        {/* Left: Brand Badge + Back + Document Title */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 hover:border-neutral-700 text-white transition-colors"
            title="Back to Dashboard"
          >
            <VLogo className="shrink-0 h-3.5 w-3.5 text-white" />
            <span className="text-neutral-500 font-mono text-[10px]">✕</span>
            <ResumeMark className="shrink-0 h-3.5 w-3.5 text-white" />
          </a>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-mono">resume /</span>
            <input
              type="text"
              value={resumeName}
              onChange={(e) => {
                const val = e.target.value;
                setResumeName(val);
                triggerAutoSave(latexSource, structuredData, val);
              }}
              className="bg-transparent hover:bg-neutral-900 focus:bg-neutral-900 text-xs sm:text-sm font-semibold tracking-tight text-white px-2 py-1 rounded border border-transparent focus:border-neutral-700 outline-none transition-all w-36 sm:w-56"
              placeholder="Resume Title"
            />
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border border-neutral-800 bg-neutral-900">
              {autoSaveStatus === "saving" && <span className="text-amber-400 animate-pulse">saving...</span>}
              {autoSaveStatus === "saved" && <span className="text-emerald-400">saved</span>}
              {autoSaveStatus === "unsaved" && <span className="text-neutral-400">unsaved</span>}
            </span>
          </div>
        </div>

        {/* Center: View Switcher (LaTeX Code vs Form Builder) */}
        <div className="flex items-center p-0.5 bg-neutral-900 border border-neutral-800 rounded-lg">
          <button
            type="button"
            onClick={() => setLeftViewMode("code")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              leftViewMode === "code"
                ? "bg-white text-black shadow-xs font-semibold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>LaTeX Code</span>
          </button>
          <button
            type="button"
            onClick={() => setLeftViewMode("form")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              leftViewMode === "form"
                ? "bg-white text-black shadow-xs font-semibold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Form Builder</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Version History Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 gap-1.5 rounded-md"
            onClick={() => setShowVersionModal(true)}
          >
            <History className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden md:inline">History</span>
          </Button>

          {/* Save Version Button */}
          <Button
            size="sm"
            className="h-8 text-xs bg-white text-black hover:bg-neutral-200 font-medium rounded-md gap-1.5 shadow-xs transition-colors"
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
                <span>Save</span>
              </>
            )}
          </Button>

          {/* Export Dropdown */}
          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-neutral-200 border-neutral-800 bg-neutral-900 hover:bg-neutral-800 gap-1 rounded-md"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span>Export</span>
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

      {/* MAIN SPLIT-PANE BODY */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Monaco Editor or Form Builder */}
        <div
          style={{ width: `${splitRatio}%` }}
          className="h-full flex flex-col border-r border-neutral-800 overflow-hidden bg-neutral-950"
        >
          {leftViewMode === "code" ? (
            <MonacoLatexEditor value={latexSource} onChange={handleLatexChange} />
          ) : (
            <StructuredFormEditor data={structuredData} onChange={handleFormDataChange} />
          )}
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
    </div>
  );
}
