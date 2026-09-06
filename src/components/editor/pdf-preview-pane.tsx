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
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-100 select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/80 border-b border-slate-800 text-xs gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            PDF Preview
          </span>

          {isCompiling ? (
            <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded text-[11px]">
              <Loader2 className="w-3 h-3 animate-spin" />
              Compiling...
            </span>
          ) : compileError ? (
            <button
              type="button"
              onClick={() => setShowLogDrawer(!showLogDrawer)}
              className="inline-flex items-center gap-1 text-red-400 bg-red-400/10 hover:bg-red-400/20 px-2 py-0.5 rounded text-[11px] transition-colors"
            >
              <AlertCircle className="w-3 h-3" />
              Compilation Failed (View Log)
            </button>
          ) : (
            <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded text-[11px]">
              Ready {compileDurationMs ? `· ${compileDurationMs}ms` : ""}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-300 hover:text-white"
            onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[11px] text-slate-400 min-w-9 text-center">{zoomLevel}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-300 hover:text-white"
            onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>

          {pdfBlobUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-300 hover:text-white ml-0.5"
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
              className="h-6 w-6 text-slate-300 hover:text-white ml-0.5"
              onClick={onRecompile}
              title="Force Recompile"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCompiling ? "animate-spin" : ""}`} />
            </Button>
          )}

          {onDownloadPdf && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[11px] text-blue-300 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 ml-1"
              onClick={onDownloadPdf}
              title="Download PDF"
            >
              <Download className="w-3 h-3 mr-1" />
              PDF
            </Button>
          )}
        </div>
      </div>

      {/* Main Vector PDF Viewer Container */}
      <div className="flex-1 overflow-hidden p-3 flex justify-center items-center bg-slate-950/70 relative">
        {isCompiling && !pdfBlobUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
            <p className="text-sm">Compiling LaTeX document...</p>
          </div>
        )}

        {compileError && !pdfBlobUrl && (
          <div className="m-auto max-w-md p-4 bg-red-950/40 border border-red-800 rounded-lg text-red-200 text-sm">
            <div className="flex items-center gap-2 font-semibold text-red-400 mb-2">
              <AlertCircle className="w-5 h-5" />
              Compilation Failed
            </div>
            <pre className="font-mono text-xs bg-black/40 p-2.5 rounded overflow-x-auto max-h-48 text-red-300">
              {compileError}
            </pre>
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="outline" onClick={onRecompile}>
                Retry Compile
              </Button>
            </div>
          </div>
        )}

        {pdfBlobUrl && (
          <div
            className="w-full h-full flex items-center justify-center transition-all"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
          >
            <iframe
              src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full rounded border border-slate-800 bg-white shadow-2xl"
              title="High-Quality Vector PDF Preview"
            />
          </div>
        )}

        {!pdfBlobUrl && !isCompiling && !compileError && (
          <div className="m-auto text-slate-500 text-sm flex flex-col items-center">
            <FileText className="w-10 h-10 mb-2 opacity-40" />
            <p>No compiled PDF yet. Start typing to compile.</p>
          </div>
        )}
      </div>

      {/* Compiler Log Drawer */}
      {showLogDrawer && (
        <div className="h-48 bg-black/95 border-t border-slate-800 p-3 font-mono text-xs text-slate-300 overflow-auto shrink-0">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-slate-400">
            <span className="font-semibold text-slate-200">LaTeX Compiler Output</span>
            <button
              type="button"
              onClick={() => setShowLogDrawer(false)}
              className="text-xs text-slate-400 hover:text-white"
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
