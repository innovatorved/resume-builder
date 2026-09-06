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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-semibold text-slate-100">Version History</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading && (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
              Loading past versions...
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 text-xs rounded-lg">
              {error}
            </div>
          )}

          {!isLoading && versions.length === 0 && !error && (
            <div className="py-12 text-center text-slate-400 text-sm">
              <History className="w-8 h-8 opacity-40 mx-auto mb-2" />
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
                    ? "bg-blue-950/20 border-blue-600/50"
                    : "bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-200">
                        Version {ver.versionNumber}
                      </span>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                          <Check className="w-3 h-3" /> Current
                        </span>
                      )}
                      {ver.isLatexCustom && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                          <FileCode className="w-3 h-3" /> Custom LaTeX
                        </span>
                      )}
                      {ver.changeSummary?.toLowerCase().includes("tailor") && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                          <Sparkles className="w-3 h-3" /> Tailored
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      {ver.changeSummary || `Saved on ${dateStr}`}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-2">
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
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                        title="Download compiled PDF from Cloudflare R2"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </a>
                    )}

                    <a
                      href={`/api/files/download?versionId=${ver.id}&fileType=source`}
                      download
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                      title="Download LaTeX source from Cloudflare R2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      .tex
                    </a>

                    {!isCurrent && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs gap-1 ml-1 bg-slate-700 hover:bg-slate-600 text-slate-100"
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
        <div className="px-5 py-3 border-t border-slate-800 flex justify-end bg-slate-950/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-300 hover:text-white"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
