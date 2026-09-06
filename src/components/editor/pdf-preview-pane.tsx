import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [_isRendering, setIsRendering] = useState<boolean>(false);
  const [showLogDrawer, setShowLogDrawer] = useState<boolean>(false);
  const [_pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  // Load and parse PDF with pdfjs-dist
  useEffect(() => {
    if (!pdfData || pdfData.length === 0) return;

    let isMounted = true;

    // Create object URL for iframe fallback or direct download
    const blob = new Blob([pdfData], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setPdfBlobUrl(url);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        // Use CDN worker if local worker is not bundled
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || "4.10.38"}/pdf.worker.min.mjs`;
        }

        const loadingTask = pdfjs.getDocument({ data: pdfData });
        const doc = await loadingTask.promise;

        if (isMounted) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(1);
        }
      } catch (err) {
        console.warn("[PdfPreviewPane] pdf.js canvas render error, using fallback viewer:", err);
      }
    })();

    return () => {
      isMounted = false;
      URL.revokeObjectURL(url);
    };
  }, [pdfData]);

  // Render current page to canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let renderTask: any = null;

    (async () => {
      try {
        setIsRendering(true);
        const page = await pdfDoc.getPage(currentPage);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const viewport = page.getViewport({ scale });
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: context,
          transform: transform || undefined,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("[PdfPreviewPane] Render error:", err);
        }
      } finally {
        setIsRendering(false);
      }
    })();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, scale]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-100 select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/80 border-b border-slate-800 text-xs gap-2">
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

        {/* Page & Zoom Controls */}
        <div className="flex items-center gap-1">
          {totalPages > 1 && (
            <div className="flex items-center mr-2 border border-slate-700 rounded bg-slate-800/60">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-300 hover:text-white"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="px-1 text-[11px] text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-300 hover:text-white"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-300 hover:text-white"
            onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[11px] text-slate-400 min-w-9 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-300 hover:text-white"
            onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>

          {onRecompile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-300 hover:text-white ml-1"
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

      {/* Main Canvas / Viewer Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex justify-center items-start bg-slate-950/60 relative"
      >
        {isCompiling && !pdfData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
            <p className="text-sm">Compiling LaTeX document...</p>
          </div>
        )}

        {compileError && !pdfData && (
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

        {pdfData && (
          <div className="shadow-2xl rounded border border-slate-800 bg-white transition-all">
            <canvas ref={canvasRef} className="block mx-auto rounded" />
          </div>
        )}

        {!pdfData && !isCompiling && !compileError && (
          <div className="m-auto text-slate-500 text-sm flex flex-col items-center">
            <FileText className="w-10 h-10 mb-2 opacity-40" />
            <p>No compiled PDF yet. Start typing to compile.</p>
          </div>
        )}
      </div>

      {/* Compiler Log Drawer */}
      {showLogDrawer && (
        <div className="h-48 bg-black/90 border-t border-slate-800 p-3 font-mono text-xs text-slate-300 overflow-auto">
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
