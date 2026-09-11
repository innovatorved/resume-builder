"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface PdfCanvasViewerProps {
  pdfData: Uint8Array;
  zoomLevel?: number;
}

let workerConfigured = false;

async function getPdfJs() {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (typeof window !== "undefined" && !workerConfigured) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      workerConfigured = true;
    } catch {
      // Fall back to workerless mode if external worker fails
    }
  }
  return pdfjsLib;
}

export function PdfCanvasViewer({ pdfData, zoomLevel = 100 }: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Keep references to active render tasks to cancel on re-render
  const renderTasksRef = useRef<{ cancel: () => void }[]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // Observe container width for responsive auto-fit
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setContainerWidth(el.clientWidth);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Render PDF pages onto canvases
  useEffect(() => {
    if (!pdfData || pdfData.length === 0) return;

    let isCancelled = false;

    // Cancel all in-flight render tasks
    renderTasksRef.current.forEach((task) => {
      try {
        task.cancel();
      } catch {
        // Ignore cancellation errors
      }
    });
    renderTasksRef.current = [];

    async function renderPdf() {
      try {
        setIsLoading(true);
        setError(null);

        const pdfjs = await getPdfJs();
        const loadingTask = pdfjs.getDocument({
          data: pdfData.slice(),
          // Use standard fonts
          cMapUrl: "https://unpkg.com/pdfjs-dist@6.3.289/cmaps/",
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setNumPages(doc.numPages);

        // Calculate responsive scale
        // Standard A4 width is 595.28 pt. We fit to container width with padding.
        const effectiveContainerWidth = containerWidth > 0 ? containerWidth : (window.innerWidth < 768 ? window.innerWidth - 24 : 600);
        const padding = window.innerWidth < 640 ? 16 : 32;
        const availableWidth = Math.max(280, effectiveContainerWidth - padding);
        const baseScale = availableWidth / 595.28;
        const targetScale = baseScale * (zoomLevel / 100);

        // DPR for sharp Retina display (cap at 2.5 for mobile memory efficiency)
        const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2.5);

        // Wait a tick for canvas refs to mount in DOM if numPages changed
        await new Promise((resolve) => setTimeout(resolve, 30));
        if (isCancelled) return;

        for (let i = 1; i <= doc.numPages; i++) {
          if (isCancelled) return;

          const page = await doc.getPage(i);
          if (isCancelled) return;

          const canvas = canvasRefs.current[i - 1];
          if (!canvas) continue;

          const context = canvas.getContext("2d");
          if (!context) continue;

          // Scale viewport by dpr for razor-sharp canvas resolution
          const viewport = page.getViewport({ scale: targetScale * dpr });

          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
          canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

          const renderContext = {
            canvas: canvas,
            canvasContext: context,
            viewport: viewport,
          };

          const task = page.render(renderContext);
          renderTasksRef.current.push(task);

          await task.promise.catch((err: { name?: string }) => {
            // Ignore normal render cancellations caused by rapid recompiles
            if (err?.name !== "RenderingCancelledException") {
              console.warn(`[PdfCanvasViewer] Page ${i} render warning:`, err);
            }
          });
        }

        if (!isCancelled) {
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error("[PdfCanvasViewer] Render error:", err);
          setError(err instanceof Error ? err.message : "Failed to render PDF canvas");
          setIsLoading(false);
        }
      }
    }

    void renderPdf();

    return () => {
      isCancelled = true;
      renderTasksRef.current.forEach((task) => {
        try {
          task.cancel();
        } catch {
          // Ignore
        }
      });
      renderTasksRef.current = [];
    };
  }, [pdfData, zoomLevel, containerWidth]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto overflow-x-auto p-2 sm:p-4 flex flex-col items-center justify-start bg-neutral-950 relative select-none"
    >
      {isLoading && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-[11px] text-neutral-300 shadow-lg backdrop-blur">
          <Loader2 className="w-3 h-3 animate-spin text-white" />
          <span>Rendering...</span>
        </div>
      )}

      {error && (
        <div className="m-auto max-w-sm p-4 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs text-center">
          <p className="font-semibold mb-1">Canvas Render Notice</p>
          <p>{error}</p>
        </div>
      )}

      {/* Pages Container */}
      <div className="flex flex-col items-center gap-4 my-auto sm:my-2 w-full max-w-full">
        {Array.from({ length: numPages || 1 }).map((_, idx) => (
          <div key={idx} className="flex flex-col items-center max-w-full">
            <canvas
              ref={(el) => {
                canvasRefs.current[idx] = el;
              }}
              className="bg-white rounded shadow-2xl border border-neutral-800/80 max-w-full transition-shadow hover:shadow-cyan-950/10"
              style={{ display: "block" }}
            />
            {numPages > 1 && (
              <span className="text-[10px] text-neutral-500 font-mono mt-1.5">
                Page {idx + 1} of {numPages}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
