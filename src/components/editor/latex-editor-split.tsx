import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileCode,
  History,
  Loader2,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getTemplate, TEMPLATES } from "@/lib/templates";
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
  };
}

export function LatexEditorSplit({ initialResume }: LatexEditorSplitProps) {
  const { toast } = useToast();

  const [resumeName, setResumeName] = useState(initialResume.name || "Untitled Resume");
  const [templateId, setTemplateId] = useState(initialResume.templateId || "clean-modern");
  const [structuredData, setStructuredData] = useState<ResumeData>(initialResume.data);
  const [currentVersionId, setCurrentVersionId] = useState<string | undefined>(
    initialResume.currentVersionId || undefined
  );

  // LaTeX source string
  const [latexSource, setLatexSource] = useState(() => {
    return getTemplate(templateId).generate(initialResume.data);
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

  const isResizingRef = useRef<boolean>(false);

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

  // Update LaTeX when template changes
  const handleTemplateChange = (newTemplateId: string) => {
    setTemplateId(newTemplateId);
    const newSource = getTemplate(newTemplateId).generate(structuredData);
    setLatexSource(newSource);
    runCompile(newSource);
  };

  // Handle Monaco code edit
  const handleLatexChange = (newCode: string) => {
    setLatexSource(newCode);
    runCompile(newCode);
  };

  // Handle AI Copilot directly modifying the LaTeX source
  const handleApplyAiLatex = (newLatex: string, summary: string) => {
    setLatexSource(newLatex);
    runCompile(newLatex);

    toast({
      title: "Prism AI Applied Changes",
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
      const generated = getTemplate(templateId).generate(
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0e0e10] text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* TOP PRISM NAVIGATION BAR */}
      <header className="h-12 border-b border-[#232326] bg-[#141416] flex items-center justify-between px-3 z-20 select-none">
        {/* Left: Back + Document Title */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#202024] transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">resume /</span>
            <input
              type="text"
              value={resumeName}
              onChange={(e) => setResumeName(e.target.value)}
              className="bg-transparent hover:bg-[#1e1e22] focus:bg-[#1e1e22] text-xs sm:text-sm font-semibold text-slate-100 px-2 py-1 rounded border border-transparent focus:border-[#38383e] outline-none transition-all w-48 sm:w-64"
              placeholder="Resume Title"
            />
          </div>
        </div>

        {/* Center: Template Switcher */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Template:</span>
          <select
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="bg-[#1c1c20] text-xs text-slate-200 border border-[#2e2e34] rounded-md px-2 py-1 outline-none hover:border-slate-500 cursor-pointer font-medium"
          >
            {Object.values(TEMPLATES).map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Version History Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-slate-300 hover:text-white hover:bg-[#202024] gap-1.5"
            onClick={() => setShowVersionModal(true)}
          >
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">History</span>
          </Button>

          {/* Save Version Button */}
          <Button
            size="sm"
            className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white gap-1.5 shadow-sm transition-all"
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
              className="h-8 text-xs text-slate-300 border-[#2e2e34] bg-[#1c1c20] hover:bg-[#25252b] gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </Button>

            <div className="absolute right-0 top-full mt-1 w-44 bg-[#18181c] border border-[#2e2e34] rounded-lg shadow-2xl py-1 hidden group-hover:block z-30 animate-in fade-in-50">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-[#24242a] flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadTex}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-[#24242a] flex items-center gap-2"
              >
                <FileCode className="w-3.5 h-3.5 text-purple-400" />
                Download .tex Source
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN SPLIT-PANE BODY */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Monaco Editor */}
        <div
          style={{ width: `${splitRatio}%` }}
          className="h-full flex flex-col border-r border-[#232326] overflow-hidden bg-[#1e1e1e]"
        >
          <MonacoLatexEditor value={latexSource} onChange={handleLatexChange} />
        </div>

        {/* Resizer Divider */}
        <div
          aria-hidden="true"
          onMouseDown={handleMouseDown}
          className="w-1.5 hover:w-2 bg-[#1c1c20] hover:bg-blue-500 cursor-col-resize transition-all z-10 select-none"
          title="Drag to resize panes"
        />

        {/* Right Pane: Vector PDF Preview */}
        <div className="flex-1 h-full overflow-hidden bg-[#141416]">
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
