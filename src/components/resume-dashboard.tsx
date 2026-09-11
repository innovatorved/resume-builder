"use client";

import {
  ArrowRight,
  Briefcase,
  Copy,
  Download,
  Edit2,
  FileText,
  GraduationCap,
  Library,
  Loader2,
  Pin,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AuthNav } from "@/components/auth-nav";
import { BrandLockup } from "@/components/brand-lockup";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createResume, deleteResume, duplicateResume, updateResume } from "@/lib/actions/resume";
import { extractResumeText, extractedResumeToResumeData } from "@/lib/pdf/extract-text";
import type { ResumeData } from "@/types/resume";

interface Resume {
  id: string;
  name: string;
  data: ResumeData;
  isPinned?: boolean | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ResumeDashboardProps {
  initialResumes: Resume[];
}

export function ResumeDashboard({ initialResumes }: ResumeDashboardProps) {
  const [resumes, setResumes] = useState<Resume[]>(initialResumes);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [isPinning, setIsPinning] = useState<string | null>(null);
  const [resumeToRename, setResumeToRename] = useState<Resume | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [descValue, setDescValue] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [syncToKnowledge, setSyncToKnowledge] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const navigate = (path: string) => {
    window.location.href = path;
  };

  // Filter and sort resumes (pinned resumes always prioritized)
  const filteredResumes = useMemo(() => {
    let list = resumes;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = resumes.filter((r) => {
        const nameMatch = r.name?.toLowerCase().includes(q);
        const titleMatch = r.data?.personalInfo?.title?.toLowerCase().includes(q);
        const personMatch = r.data?.personalInfo?.name?.toLowerCase().includes(q);
        const skillsMatch = (r.data?.skills || []).some((s) => s.toLowerCase().includes(q));
        return nameMatch || titleMatch || personMatch || skillsMatch;
      });
    }

    return [...list].sort((a, b) => {
      const pinA = a.isPinned ? 1 : 0;
      const pinB = b.isPinned ? 1 : 0;
      if (pinB !== pinA) {
        return pinB - pinA;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [resumes, searchQuery]);

  const handleTogglePin = async (resume: Resume) => {
    const nextPinned = !resume.isPinned;
    setIsPinning(resume.id);
    try {
      const result = await updateResume({
        id: resume.id,
        isPinned: nextPinned,
      });
      if (result.success) {
        setResumes((prev) =>
          prev.map((r) => (r.id === resume.id ? { ...r, isPinned: nextPinned } : r))
        );
        toast({
          title: nextPinned ? "Resume pinned" : "Resume unpinned",
          description: nextPinned
            ? `"${resume.name}" pinned to top of your list.`
            : `"${resume.name}" unpinned.`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update pin status",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update pin status",
        variant: "destructive",
      });
    } finally {
      setIsPinning(null);
    }
  };

  const handleDeleteResume = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteResume(id);
      if (result.success) {
        setResumes((prev) => prev.filter((r) => r.id !== id));
        toast({
          title: "Resume deleted",
          description: `"${name}" has been removed.`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete resume",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete resume",
        variant: "destructive",
      });
    }
  };

  const handleOpenRename = (r: Resume) => {
    setResumeToRename(r);
    setRenameValue(r.name);
    const existingTitle = r.data?.personalInfo?.title || "";
    const isDummyTitle =
      existingTitle.toLowerCase() === "senior software engineer" ||
      existingTitle.toLowerCase() === "professional resume";
    setDescValue(isDummyTitle ? "" : existingTitle);
  };

  const handleConfirmRename = async () => {
    if (!resumeToRename || !renameValue.trim()) return;

    try {
      const updatedData: ResumeData = {
        ...resumeToRename.data,
        personalInfo: {
          ...(resumeToRename.data?.personalInfo || { name: "" }),
          title: descValue.trim(),
        },
      };

      const result = await updateResume({
        id: resumeToRename.id,
        name: renameValue.trim(),
        data: updatedData,
      });

      if (result.success) {
        setResumes((prev) =>
          prev.map((r) =>
            r.id === resumeToRename.id ? { ...r, name: renameValue.trim(), data: updatedData } : r
          )
        );
        toast({
          title: "Resume updated",
          description: `Saved changes to "${renameValue.trim()}".`,
        });
        setResumeToRename(null);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update resume",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update resume",
        variant: "destructive",
      });
    }
  };

  const handleUploadResumeFile = async (file: File) => {
    if (!file) return;
    setIsUploadingResume(true);
    setUploadProgressText("Extracting resume content...");
    try {
      const extracted = await extractResumeText(file);
      setUploadProgressText("Preparing structured resume data...");
      const resumeData = extractedResumeToResumeData(extracted);
      const cleanName = extracted.name.replace(/\.[^/.]+$/, "");

      setUploadProgressText("Saving resume document...");
      const createRes = await createResume({
        name: cleanName || "Uploaded Resume",
        data: resumeData,
        rawLatex: extracted.fileType === "latex" ? extracted.text : undefined,
      });

      if (!createRes.success || !createRes.data?.id) {
        throw new Error(createRes.error || "Failed to create resume.");
      }

      // If requested, also index into AI Knowledge Base
      if (syncToKnowledge) {
        setUploadProgressText("Syncing with AI Knowledge Base...");
        try {
          await fetch("/api/knowledge/sources", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-idempotency-key": crypto.randomUUID(),
            },
            body: JSON.stringify({
              type: "resume",
              name: file.name,
              content: extracted.text,
              mimeType: extracted.fileType === "latex" ? "text/plain" : "text/markdown",
            }),
          });
        } catch {
          // Non-blocking if knowledge agent sync fails
        }
      }

      toast({
        title: "Resume Imported",
        description: `"${file.name}" has been processed. Opening editor...`,
      });

      setUploadModalOpen(false);
      navigate(`/resume/${createRes.data.id}`);
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Failed to parse resume document.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingResume(false);
      setUploadProgressText("");
    }
  };

  // Synchronously duplicates resume and its version object
  const handleDuplicateResume = async (targetResume: Resume) => {
    setIsDuplicating(targetResume.id);
    try {
      const result = await duplicateResume(targetResume.id);
      if (result.success && result.data) {
        setResumes((prev) => [result.data, ...prev]);
        toast({
          title: "Resume duplicated",
          description: `Created "${result.data.name}". Opening studio...`,
        });
      } else {
        toast({
          title: "Duplication failed",
          description: result.error || "Could not duplicate resume.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Duplication error",
        description: "An unexpected error occurred while duplicating.",
        variant: "destructive",
      });
    } finally {
      setIsDuplicating(null);
    }
  };

  const handleDownloadPDF = async (resumeItem: Resume) => {
    setIsDownloading(resumeItem.id);
    try {
      const response = await fetch(
        `/api/files/download?resumeId=${encodeURIComponent(resumeItem.id)}&fileType=pdf&redirect=false`
      );
      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        data?: { downloadUrl: string };
      };
      if (!response.ok || !result.success || !result.data?.downloadUrl) {
        throw new Error(result.error || "Failed to download the saved PDF.");
      }

      const link = document.createElement("a");
      link.href = result.data.downloadUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "PDF Downloaded",
        description: "The latest saved resume was downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download the saved PDF.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="border-b border-border/80 bg-background/95 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <BrandLockup size="md" showTagline={false} />

            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
              <Button
                onClick={() => navigate("/knowledge")}
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground"
                title="Evidence Library"
              >
                <Library className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Knowledge</span>
              </Button>

              {/* Upload Existing Resume CTA */}
              <Button
                onClick={() => setUploadModalOpen(true)}
                variant="outline"
                size="sm"
                className="h-8 px-2 sm:px-3 border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 hover:text-white font-medium text-xs gap-1.5 cursor-pointer"
                title="Upload Existing Resume"
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </Button>

              {/* Primary New Resume CTA */}
              <Button
                onClick={() => navigate("/resume/new")}
                size="sm"
                className="h-8 px-2.5 sm:px-3 bg-white text-black hover:bg-neutral-200 font-medium text-xs gap-1.5 shadow-xs cursor-pointer"
                title="Create New Resume"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New</span>
                <span className="hidden sm:inline">Resume</span>
              </Button>

              <AuthNav />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-6xl">
        {/* Top bar with stats and search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-border/60">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <span>My Resumes</span>
              <span className="text-xs font-normal text-muted-foreground bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-2.5 py-0.5 rounded-full">
                {resumes.length}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Create, edit, duplicate, and compile your LaTeX-typeset resumes with AI assistance.
            </p>
          </div>

          {/* Search input */}
          {resumes.length > 0 && (
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search resumes, titles, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-lg text-foreground placeholder:text-neutral-500 outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Empty State */}
        {resumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto border border-dashed border-border rounded-xl p-8 bg-neutral-50/50 dark:bg-neutral-900/20">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mb-4 text-foreground">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground mb-1">
              No resumes yet
            </h3>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Create your first professional resume using our interactive LaTeX studio.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={() => setUploadModalOpen(true)}
                variant="outline"
                className="text-xs h-9 px-4 font-medium gap-1.5 cursor-pointer border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 hover:text-white"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Existing Resume</span>
              </Button>
              <Button
                onClick={() => navigate("/resume/new")}
                className="bg-white text-black hover:bg-neutral-200 text-xs h-9 px-5 font-medium gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Resume</span>
              </Button>
            </div>
          </div>
        ) : filteredResumes.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-xs space-y-2">
            <p>No resumes matching "{searchQuery}"</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="text-xs text-foreground underline"
            >
              Clear search
            </Button>
          </div>
        ) : (
          /* Resume Single-Row List */
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/60 divide-y divide-neutral-200 dark:divide-neutral-800/80 overflow-hidden shadow-xs">
            {/* Header row for table/list clarity */}
            <div className="hidden sm:flex items-center justify-between px-5 py-2.5 bg-neutral-50/70 dark:bg-neutral-900/40 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              <span>Resume Document</span>
              <span>Updated & Actions</span>
            </div>

            {filteredResumes.map((item) => {
              const expCount = item.data?.experience?.length || 0;
              const eduCount = item.data?.education?.length || 0;
              const skillsCount = item.data?.skills?.length || 0;

              // Extract user-provided candidate title and name; ignore dummy fallback text
              const rawTitle = item.data?.personalInfo?.title?.trim() || "";
              const rawName = item.data?.personalInfo?.name?.trim() || "";
              const isDummyTitle =
                rawTitle.toLowerCase() === "senior software engineer" ||
                rawTitle.toLowerCase() === "professional resume";
              const isDummyName = rawName.toLowerCase() === "alex morgan";

              const validTitle = isDummyTitle ? "" : rawTitle;
              const validName = isDummyName ? "" : rawName;

              let subtitle = "";
              if (validTitle && validName) {
                subtitle = `${validTitle} · ${validName}`;
              } else if (validTitle) {
                subtitle = validTitle;
              } else if (validName) {
                subtitle = validName;
              }

              return (
                <div
                  key={item.id}
                  className="group flex flex-col md:flex-row md:items-center justify-between p-4 sm:px-5 sm:py-3.5 hover:bg-neutral-50/80 dark:hover:bg-neutral-900/40 transition-colors gap-3 md:gap-4"
                >
                  {/* Left Column: Icon + Name + Subtitle + Metadata Badges */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-500 shrink-0 group-hover:border-neutral-300 dark:group-hover:border-neutral-700 transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/resume/${item.id}`)}
                          className="text-left font-semibold text-sm text-foreground hover:underline decoration-neutral-400 underline-offset-2 truncate cursor-pointer transition-colors"
                          title={item.name}
                        >
                          {item.name}
                        </button>

                        {/* Metadata Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-neutral-500">
                          {item.isPinned && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 font-medium">
                              <Pin className="w-2.5 h-2.5 fill-amber-500 text-amber-500 rotate-45" />
                              <span>Pinned</span>
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-mono text-neutral-600 dark:text-neutral-400">
                            LaTeX
                          </span>
                          {expCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                              <Briefcase className="w-2.5 h-2.5" />
                              <span>{expCount} exp</span>
                            </span>
                          )}
                          {eduCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                              <GraduationCap className="w-2.5 h-2.5" />
                              <span>{eduCount} edu</span>
                            </span>
                          )}
                          {skillsCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                              <span>{skillsCount} skills</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                        {subtitle ? (
                          <>
                            <span className="truncate">{subtitle}</span>
                            <span className="text-neutral-300 dark:text-neutral-700 hidden sm:inline">
                              •
                            </span>
                          </>
                        ) : null}
                        <span className="text-[11px] text-neutral-400 hidden sm:inline">
                          Updated{" "}
                          {new Date(item.updatedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Date (mobile) + Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-900">
                    <span className="text-[11px] text-neutral-400 sm:hidden">
                      {new Date(item.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>

                    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                      {/* Duplicate Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDuplicating === item.id}
                        onClick={() => handleDuplicateResume(item)}
                        className="h-8 w-8 p-0 sm:w-auto sm:px-2.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                        title="Duplicate Resume"
                      >
                        {isDuplicating === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 sm:mr-1.5" />
                            <span className="hidden sm:inline">Duplicate</span>
                          </>
                        )}
                      </Button>

                      {/* Download PDF Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDownloading === item.id}
                        onClick={() => handleDownloadPDF(item)}
                        className="h-8 w-8 p-0 sm:w-auto sm:px-2.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                        title="Download compiled PDF"
                      >
                        {isDownloading === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 sm:mr-1.5" />
                            <span className="hidden sm:inline">PDF</span>
                          </>
                        )}
                      </Button>

                      {/* Pin / Unpin Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPinning === item.id}
                        onClick={() => handleTogglePin(item)}
                        className={`h-8 w-8 p-0 cursor-pointer ${
                          item.isPinned
                            ? "text-amber-500 hover:text-amber-600 bg-amber-50/60 dark:bg-amber-950/30"
                            : "text-neutral-400 hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900"
                        }`}
                        title={item.isPinned ? "Unpin resume" : "Pin resume to top"}
                      >
                        <Pin
                          className={`w-3.5 h-3.5 ${
                            item.isPinned ? "fill-amber-500 text-amber-500 rotate-45" : ""
                          }`}
                        />
                      </Button>

                      {/* Rename Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenRename(item)}
                        className="h-8 w-8 p-0 text-neutral-400 hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteResume(item.id, item.name)}
                        className="h-8 w-8 p-0 text-neutral-400 hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>

                      {/* Open Studio Button */}
                      <Button
                        size="sm"
                        onClick={() => navigate(`/resume/${item.id}`)}
                        className="h-8 px-3 text-xs bg-neutral-900 text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 font-medium gap-1.5 cursor-pointer shadow-xs ml-1"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Resume Details Modal */}
        {resumeToRename && (
          <Dialog
            open={Boolean(resumeToRename)}
            onOpenChange={(open) => !open && setResumeToRename(null)}
          >
            <DialogContent className="max-w-md bg-neutral-950 border-neutral-800 text-white">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">Edit Resume Details</DialogTitle>
                <p className="text-xs text-neutral-400">
                  Update the resume title and optional target role description.
                </p>
              </DialogHeader>
              <div className="py-3 space-y-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="resume-title"
                    className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider"
                  >
                    Resume Title
                  </label>
                  <Input
                    id="resume-title"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder="e.g. Full Stack Resume 2026"
                    className="h-9 text-xs bg-neutral-900 border-neutral-800 text-white"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="resume-target-role"
                    className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider"
                  >
                    Description / Target Role{" "}
                    <span className="text-neutral-500 font-normal">(optional)</span>
                  </label>
                  <Input
                    id="resume-target-role"
                    value={descValue}
                    onChange={(e) => setDescValue(e.target.value)}
                    placeholder="e.g. Senior Backend Engineer (leave blank to hide)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmRename();
                    }}
                    className="h-9 text-xs bg-neutral-900 border-neutral-800 text-white"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setResumeToRename(null)}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmRename}
                  disabled={!renameValue.trim()}
                  className="text-xs bg-white text-black hover:bg-neutral-200 font-medium"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Upload Existing Resume Modal */}
        <Dialog open={uploadModalOpen} onOpenChange={(open) => !isUploadingResume && setUploadModalOpen(open)}>
          <DialogContent className="max-w-lg bg-neutral-950 border-neutral-800 text-white p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <Upload className="w-4 h-4 text-neutral-400" />
                <span>Upload Existing Resume</span>
              </DialogTitle>
              <p className="text-xs text-neutral-400">
                Import an existing resume in PDF, LaTeX (.tex), Markdown, Text, or JSON format.
              </p>
            </DialogHeader>

            <div className="py-3 space-y-4">
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleUploadResumeFile(file);
                }}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition cursor-pointer ${
                  dragOver
                    ? "border-white bg-neutral-900"
                    : "border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/80 hover:border-neutral-700"
                } ${isUploadingResume ? "pointer-events-none opacity-60" : ""}`}
              >
                <input
                  type="file"
                  accept=".pdf,.tex,.md,.markdown,.txt,.json,application/pdf,application/x-latex,text/x-tex,text/markdown,text/plain,application/json"
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  disabled={isUploadingResume}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUploadResumeFile(file);
                  }}
                />

                {isUploadingResume ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                    <p className="text-xs text-neutral-300 font-medium mt-2">{uploadProgressText}</p>
                    <p className="text-[11px] text-neutral-500">Parsing structure, contact, and experience...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mb-3 text-neutral-300">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      Click to upload or drag & drop resume file
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      PDF, LaTeX (.tex), Markdown (.md), Plain Text (.txt), or JSON Resume
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                      {["PDF", "LaTeX", "Markdown", "Text", "JSON"].map((fmt) => (
                        <span
                          key={fmt}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800/80 text-neutral-400 border border-neutral-700/50"
                        >
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </label>

              <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/30 p-3">
                <input
                  id="sync-kb"
                  type="checkbox"
                  checked={syncToKnowledge}
                  onChange={(e) => setSyncToKnowledge(e.target.checked)}
                  disabled={isUploadingResume}
                  className="rounded border-neutral-700 bg-neutral-900 text-white focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="sync-kb" className="text-xs text-neutral-300 cursor-pointer select-none">
                  Sync into AI Knowledge Base (enables durable workflow indexing & agent live logs)
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={isUploadingResume}
                onClick={() => setUploadModalOpen(false)}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
