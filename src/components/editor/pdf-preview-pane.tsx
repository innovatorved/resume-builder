import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PdfCanvasViewer } from "./pdf-canvas-viewer";

interface PdfPreviewPaneProps {
  pdfData: Uint8Array | null;
  isCompiling: boolean;
  compileError?: string;
  compileDurationMs?: number;
  onRecompile?: () => void;
  onDownloadPdf?: () => void;
  onDownloadTex?: () => void;
}

export function PdfPreviewPane({
  pdfData,
  isCompiling,
  compileError,
  compileDurationMs,
  onRecompile,
  onDownloadPdf,
  onDownloadTex: _onDownloadTex,
}: PdfPreviewPaneProps) {
  const [showLogDrawer, setShowLogDrawer] = useState<boolean>(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [viewMode, setViewMode] = useState<"canvas" | "iframe">("canvas");

  // Generate object URL whenever new PDF bytes are compiled
  useEffect(() => {
    if (!pdfData || pdfData.length === 0) return;

    const blob = new Blob([pdfData as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setPdfBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [pdfData]);

  const handleOpenNewTab = () => {
    if (!pdfBlobUrl) return;
    window.open(pdfBlobUrl, "_blank");
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 border-l border-neutral-800 text-neutral-100 select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 bg-neutral-950 border-b border-neutral-800 text-xs gap-2 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="font-semibold text-neutral-200 flex items-center gap-1.5 tracking-tight shrink-0">
            <FileText className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Vector Preview</span>
          </span>

          {isCompiling ? (
            <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] shrink-0">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Compiling...</span>
            </span>
          ) : compileError ? (
            <button
              type="button"
              onClick={() => setShowLogDrawer(!showLogDrawer)}
              className="inline-flex items-center gap-1 text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/20 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] transition-colors truncate"
            >
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span className="truncate">Errors (View Log)</span>
            </button>
          ) : (
            <span className="text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] shrink-0">
              <span className="sm:hidden">Ready</span>
              <span className="hidden sm:inline">Ready {compileDurationMs ? `· ${compileDurationMs}ms` : ""}</span>
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Zoom controls hidden on mobile to avoid cramped toolbar */}
          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-neutral-400 hover:text-white hover:bg-neutral-900"
              onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[11px] text-neutral-400 min-w-9 text-center font-mono">
              {zoomLevel}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-neutral-400 hover:text-white hover:bg-neutral-900"
              onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>

          {pdfBlobUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-6 sm:w-6 text-neutral-400 hover:text-white hover:bg-neutral-900"
              onClick={handleOpenNewTab}
              title="Open PDF in full tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}

          {onRecompile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-6 sm:w-6 text-neutral-400 hover:text-white hover:bg-neutral-900"
              onClick={onRecompile}
              title="Force Recompile"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCompiling ? "animate-spin" : ""}`} />
            </Button>
          )}

          {/* Desktop Toggle between Canvas and Native Iframe */}
          {pdfData && (
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex h-6 px-1.5 text-[10px] font-mono text-neutral-400 hover:text-white hover:bg-neutral-900 rounded"
              onClick={() => setViewMode(viewMode === "canvas" ? "iframe" : "canvas")}
              title={
                viewMode === "canvas"
                  ? "Switch to native browser PDF iframe"
                  : "Switch to inline high-res canvas renderer"
              }
            >
              {viewMode === "canvas" ? "Canvas" : "Native"}
            </Button>
          )}

          {onDownloadPdf && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 sm:h-6 px-2 text-[11px] text-white border-neutral-800 bg-neutral-900 hover:bg-neutral-800 rounded"
              onClick={onDownloadPdf}
              title="Download PDF"
            >
              <Download className="w-3 h-3 sm:mr-1 text-neutral-400" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Vector PDF Viewer Container */}
      <div className="flex-1 overflow-hidden p-0 sm:p-2 flex justify-center items-center bg-neutral-950 relative">
        {isCompiling && !pdfData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 text-neutral-400">
            <Loader2 className="w-8 h-8 animate-spin text-white mb-2" />
            <p className="text-sm">Compiling LaTeX document...</p>
          </div>
        )}

        {compileError && !pdfData && (
          <div className="m-auto max-w-md p-4 bg-neutral-900 border border-red-500/30 rounded-lg text-red-200 text-sm">
            <div className="flex items-center gap-2 font-semibold text-red-400 mb-2">
              <AlertCircle className="w-5 h-5" />
              Compilation Failed
            </div>
            <pre className="font-mono text-xs bg-black p-2.5 rounded overflow-x-auto max-h-48 text-red-300 border border-neutral-800">
              {compileError}
            </pre>
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={onRecompile}
                className="border-neutral-700 text-xs"
              >
                Retry Compile
              </Button>
            </div>
          </div>
        )}

        {pdfData && viewMode === "canvas" && (
          <PdfCanvasViewer pdfData={pdfData} zoomLevel={zoomLevel} />
        )}

        {pdfBlobUrl && viewMode === "iframe" && (
          <div
            className="w-full h-full flex items-center justify-center transition-all"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
          >
            <iframe
              src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full rounded border border-neutral-800 bg-white shadow-2xl"
              title="High-Quality Vector PDF Preview"
            />
          </div>
        )}

        {!pdfData && !isCompiling && !compileError && (
          <div className="m-auto text-neutral-500 text-sm flex flex-col items-center">
            <FileText className="w-10 h-10 mb-2 opacity-30" />
            <p>No compiled PDF yet. Start typing to compile.</p>
          </div>
        )}
      </div>

      {/* Compiler Log Drawer */}
      {showLogDrawer && (
        <div className="h-48 bg-neutral-950 border-t border-neutral-800 p-3 font-mono text-xs text-neutral-300 overflow-auto shrink-0">
          <div className="flex justify-between items-center pb-2 border-b border-neutral-800 text-neutral-400">
            <span className="font-semibold text-neutral-200">LaTeX Compiler Output</span>
            <button
              type="button"
              onClick={() => setShowLogDrawer(false)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <pre className="mt-2 whitespace-pre-wrap">
            {compileError || "No compilation errors recorded."}
          </pre>
        </div>
      )}
    </div>
  );
}
