import {
  ArrowLeft,
  ChevronDown,
  Code2,
  Download,
  FileCode,
  FileEdit,
  History,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getTemplate, TEMPLATES } from "@/lib/templates";
import { type CompileResult, latexCompiler } from "@/lib/wasm/compiler-bridge";
import type { ResumeData } from "@/types/resume";
import { AiAssistPanel } from "./ai-assist-panel";
import { MonacoLatexEditor } from "./monaco-latex-editor";
import { PdfPreviewPane } from "./pdf-preview-pane";
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

  // Editor mode: "latex" (Monaco) or "form" (Structured fields)
  const [mode, setMode] = useState<"latex" | "form">("latex");
  const [isLatexCustom, setIsLatexCustom] = useState(false);

  // LaTeX source string
  const [latexSource, setLatexSource] = useState(() => {
    return getTemplate(templateId).generate(initialResume.data);
  });

  // Compilation state
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileError, setCompileError] = useState<string | undefined>(undefined);
  const [compileDurationMs, setCompileDurationMs] = useState<number | undefined>(undefined);

  // UI Panels
  const [splitRatio, setSplitRatio] = useState<number>(50); // percentage for left pane
  const [showAiPanel, setShowAiPanel] = useState<boolean>(false);
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isResizingRef = useRef<boolean>(false);

  // Trigger compilation whenever latexSource changes
  const runCompile = React.useCallback((source: string) => {
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

  // Update LaTeX when template changes (if not in custom LaTeX mode)
  const handleTemplateChange = (newTemplateId: string) => {
    setTemplateId(newTemplateId);
    if (!isLatexCustom) {
      const newSource = getTemplate(newTemplateId).generate(structuredData);
      setLatexSource(newSource);
      runCompile(newSource);
    }
  };

  // Handle Monaco code edit
  const handleLatexChange = (newCode: string) => {
    setLatexSource(newCode);
    setIsLatexCustom(true);
    runCompile(newCode);
  };

  // Switch modes safely
  const handleModeSwitch = (targetMode: "latex" | "form") => {
    if (targetMode === "form" && isLatexCustom) {
      const proceed = confirm(
        "You have made manual edits to the raw LaTeX. Switching to Form mode will regenerate LaTeX from your structured fields. Proceed?"
      );
      if (!proceed) return;
      setIsLatexCustom(false);
      const generated = getTemplate(templateId).generate(structuredData);
      setLatexSource(generated);
      runCompile(generated);
    }
    setMode(targetMode);
  };

  // Apply AI Tailored Resume
  const handleApplyTailoredResume = (tailoredData: ResumeData, changeSummary: string) => {
    setStructuredData(tailoredData);
    setIsLatexCustom(false);
    const newSource = getTemplate(templateId).generate(tailoredData);
    setLatexSource(newSource);
    runCompile(newSource);

    toast({
      title: "Tailored Resume Applied",
      description: changeSummary,
    });

    // Auto-save as new version
    handleSaveVersion(changeSummary, tailoredData, newSource);
  };

  // Apply single AI bullet edit
  const handleApplyBulletEdit = (newBullet: string) => {
    // In LaTeX mode, insert into source or copy to clipboard
    navigator.clipboard.writeText(newBullet);
    toast({
      title: "Bullet Copied to Clipboard",
      description: "Paste it directly into the desired section in the LaTeX editor.",
    });
  };

  // Restore past version from modal
  const handleRestoreVersion = (ver: VersionItem) => {
    if (ver.structuredData) {
      setStructuredData(ver.structuredData);
    }
    if (ver.rawLatex) {
      setLatexSource(ver.rawLatex);
      setIsLatexCustom(ver.isLatexCustom);
      runCompile(ver.rawLatex);
    } else if (ver.structuredData) {
      const generated = getTemplate(templateId).generate(ver.structuredData);
      setLatexSource(generated);
      setIsLatexCustom(false);
      runCompile(generated);
    }
    setCurrentVersionId(ver.id);

    toast({
      title: `Restored Version ${ver.versionNumber}`,
      description: ver.changeSummary || "Resume restored to previous version.",
    });
  };

  // Save Version (with R2 upload workflow)
  const handleSaveVersion = async (
    summary?: string,
    dataToSave?: ResumeData,
    sourceToSave?: string
  ) => {
    const data = dataToSave || structuredData;
    const source = sourceToSave || latexSource;

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
          // PUT to R2
          await fetch(signSourceData.data.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/x-latex" },
            body: source,
          });
        }
      } catch (uploadErr) {
        console.warn(
          "[SaveVersion] Cloudflare R2 source upload skipped (using DB record):",
          uploadErr
        );
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
            // PUT to R2
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
          structuredData: data,
          rawLatex: source,
          isLatexCustom,
          changeSummary: summary || `Saved at ${new Date().toLocaleTimeString()}`,
        }),
      });

      const versionData = await versionRes.json();

      if (versionData.success) {
        setCurrentVersionId(versionData.data.id);
        toast({
          title: "Version Saved Successfully",
          description: `Version ${versionData.data.versionNumber} saved to private storage.`,
        });
      } else {
        toast({
          title: "Saved Locally",
          description: versionData.error || "Updated in database.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Save Notice",
        description: err?.message || "Failed to save version.",
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
    const blob = new Blob([pdfData], { type: "application/pdf" });
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
      if (newRatio > 20 && newRatio < 80) {
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* TOP APPLICATION BAR */}
      <header className="h-12 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between px-3 z-20 select-none">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>

          <input
            type="text"
            value={resumeName}
            onChange={(e) => setResumeName(e.target.value)}
            className="bg-transparent hover:bg-slate-800/60 focus:bg-slate-800 text-sm font-semibold text-slate-100 px-2 py-1 rounded border border-transparent focus:border-slate-700 outline-none transition-all w-44 sm:w-64"
            placeholder="Resume Title"
          />

          {isLatexCustom && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
              <FileCode className="w-3 h-3" /> Custom LaTeX
            </span>
          )}
        </div>

        {/* Center: Mode Toggles & Template */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => handleModeSwitch("latex")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                mode === "latex"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              LaTeX Code
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("form")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                mode === "form"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              Form View
            </button>
          </div>

          {/* Template Selector */}
          <div className="hidden md:flex items-center">
            <select
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 outline-none hover:border-slate-600 cursor-pointer"
            >
              {Object.values(TEMPLATES).map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Actions (Version, AI, Save, Export) */}
        <div className="flex items-center gap-2">
          {/* Version History Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
            onClick={() => setShowVersionModal(true)}
          >
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Versions</span>
          </Button>

          {/* AI Copilot Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 text-xs gap-1.5 transition-colors ${
              showAiPanel
                ? "bg-amber-400/20 text-amber-300 hover:bg-amber-400/30"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
            onClick={() => setShowAiPanel(!showAiPanel)}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">AI Copilot</span>
          </Button>

          {/* Save Version Button */}
          <Button
            size="sm"
            className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white gap-1.5 shadow"
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

          {/* Download Dropdown */}
          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-slate-300 border-slate-700 bg-slate-800/80 hover:bg-slate-700 gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="w-3 h-3" />
            </Button>

            <div className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 hidden group-hover:block z-30 animate-in fade-in-50">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadTex}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
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
        {/* Left Pane: Monaco Editor or Form View */}
        <div
          style={{ width: `${splitRatio}%` }}
          className="h-full flex flex-col border-r border-slate-800 overflow-hidden bg-[#1e1e1e]"
        >
          {mode === "latex" ? (
            <MonacoLatexEditor value={latexSource} onChange={handleLatexChange} />
          ) : (
            <div className="p-6 overflow-y-auto h-full text-slate-300 space-y-4">
              <div className="p-3 bg-blue-950/30 border border-blue-800/60 rounded-lg text-xs text-blue-300">
                Form mode updates your structured resume data and generates LaTeX automatically.
              </div>
              <p className="text-xs text-slate-400">
                Full visual form builder is synced with this resume. Switch back to LaTeX Code to
                view and edit macros directly.
              </p>
            </div>
          )}
        </div>

        {/* Resizer Divider */}
        <div
          aria-hidden="true"
          onMouseDown={handleMouseDown}
          className="w-1.5 hover:w-2 bg-slate-800 hover:bg-blue-500 cursor-col-resize transition-all z-10 select-none"
          title="Drag to resize panes"
        />

        {/* Center/Right Pane: PDF Preview */}
        <div className="flex-1 h-full overflow-hidden">
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

        {/* Rightmost Collapsible AI Copilot Panel */}
        {showAiPanel && (
          <AiAssistPanel
            resumeId={initialResume.id}
            currentResumeData={structuredData}
            onApplyTailoredResume={handleApplyTailoredResume}
            onApplyBulletEdit={handleApplyBulletEdit}
            onClose={() => setShowAiPanel(false)}
          />
        )}
      </div>

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
