import {
  Calendar,
  Check,
  Clock,
  Download,
  FileCode,
  History,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export interface VersionItem {
  id: string;
  resumeId: string;
  versionNumber: number;
  sourceKey: string;
  pdfKey: string | null;
  structuredData: Record<string, unknown> | null;
  rawLatex: string | null;
  isLatexCustom: boolean;
  changeSummary: string | null;
  createdAt: string | number | Date;
}

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeId: string;
  currentVersionId?: string;
  onRestoreVersion: (version: VersionItem) => void;
}

export function VersionHistoryModal({
  isOpen,
  onClose,
  resumeId,
  currentVersionId,
  onRestoreVersion,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !resumeId) return;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/versions?resumeId=${resumeId}`);
        const data = await res.json();
        if (data.success) {
          setVersions(data.data || []);
        } else {
          setError(data.error || "Failed to load versions");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load versions");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isOpen, resumeId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-lg shadow-2xl flex flex-col max-h-[85vh] text-neutral-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-neutral-400" />
            <h2 className="text-base font-semibold tracking-tight text-white">Version History</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading && (
            <div className="py-12 text-center text-neutral-400 text-sm">
              <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-neutral-300" />
              Loading past versions...
            </div>
          )}

          {error && (
            <div className="p-3 bg-neutral-900 border border-red-500/30 text-red-300 text-xs rounded-lg">
              {error}
            </div>
          )}

          {!isLoading && versions.length === 0 && !error && (
            <div className="py-12 text-center text-neutral-500 text-sm">
              <History className="w-8 h-8 opacity-30 mx-auto mb-2" />
              No saved versions yet. Versions are recorded whenever you save or export.
            </div>
          )}

          {versions.map((ver) => {
            const isCurrent = ver.id === currentVersionId;
            const dateStr = new Date(ver.createdAt).toLocaleString();

            return (
              <div
                key={ver.id}
                className={`p-4 rounded-lg border transition-all ${
                  isCurrent
                    ? "bg-neutral-900 border-neutral-700"
                    : "bg-neutral-900/40 border-neutral-800/80 hover:bg-neutral-900/80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-neutral-200">
                        Version {ver.versionNumber}
                      </span>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white text-black px-2 py-0.5 rounded">
                          <Check className="w-3 h-3" /> Current
                        </span>
                      )}
                      {ver.isLatexCustom && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
                          <FileCode className="w-3 h-3" /> Custom LaTeX
                        </span>
                      )}
                      {ver.changeSummary?.toLowerCase().includes("tailor") && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                          <Sparkles className="w-3 h-3" /> Tailored
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-neutral-400 mt-1">
                      {ver.changeSummary || `Saved on ${dateStr}`}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-2">
                      <Calendar className="w-3 h-3" />
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {ver.pdfKey && (
                      <a
                        href={`/api/files/download?versionId=${ver.id}&fileType=pdf`}
                        download
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800 transition-colors"
                        title="Download compiled PDF from Cloudflare R2"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </a>
                    )}

                    <a
                      href={`/api/files/download?versionId=${ver.id}&fileType=source`}
                      download
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800 transition-colors"
                      title="Download LaTeX source from Cloudflare R2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      .tex
                    </a>

                    {!isCurrent && (
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1 ml-1 bg-white text-black hover:bg-neutral-200"
                        onClick={() => {
                          onRestoreVersion(ver);
                          onClose();
                        }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 flex justify-end bg-neutral-950">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-neutral-400 hover:text-white"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
