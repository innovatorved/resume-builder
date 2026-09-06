"use client";

import {
  ArrowRight,
  Briefcase,
  Copy,
  Download,
  Edit2,
  Eye,
  FileJson,
  FileText,
  GraduationCap,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  Trash2,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createResume, deleteResume, duplicateResume, updateResume } from "@/lib/actions/resume";
import { downloadCompiledPdf } from "@/lib/latex-generator";
import type { ResumeData } from "@/types/resume";

interface Resume {
  id: string;
  name: string;
  data: ResumeData;
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
  const [resumeToRename, setResumeToRename] = useState<Resume | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const { toast } = useToast();

  const navigate = (path: string) => {
    window.location.href = path;
  };

  // Filter resumes based on search query
  const filteredResumes = useMemo(() => {
    if (!searchQuery.trim()) return resumes;
    const q = searchQuery.toLowerCase();
    return resumes.filter((r) => {
      const nameMatch = r.name?.toLowerCase().includes(q);
      const titleMatch = r.data?.personalInfo?.title?.toLowerCase().includes(q);
      const personMatch = r.data?.personalInfo?.name?.toLowerCase().includes(q);
      const skillsMatch = (r.data?.skills || []).some((s) => s.toLowerCase().includes(q));
      return nameMatch || titleMatch || personMatch || skillsMatch;
    });
  }, [resumes, searchQuery]);

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
  };

  const handleConfirmRename = async () => {
    if (!resumeToRename || !renameValue.trim()) return;

    try {
      const result = await updateResume({ id: resumeToRename.id, name: renameValue.trim() });
      if (result.success && result.data) {
        setResumes((prev) =>
          prev.map((r) => (r.id === resumeToRename.id ? { ...r, name: renameValue.trim() } : r))
        );
        toast({
          title: "Resume renamed",
          description: `Renamed to "${renameValue.trim()}".`,
        });
        setResumeToRename(null);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to rename resume",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to rename resume",
        variant: "destructive",
      });
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
      await downloadCompiledPdf(resumeItem.data);
      toast({
        title: "PDF Downloaded",
        description: "LaTeX document compiled and downloaded successfully.",
      });
    } catch {
      toast({
        title: "Download failed",
        description: "Failed to generate PDF from LaTeX. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const handleImportFromJson = async () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const resumeName = parsed.personalInfo?.name
        ? `${parsed.personalInfo.name}'s Resume`
        : "Imported Resume";
      const result = await createResume({ name: resumeName, data: parsed });

      if (result.success && result.data) {
        setResumes((prev) => [result.data, ...prev]);
        setShowJsonDialog(false);
        setJsonInput("");
        toast({
          title: "Resume imported",
          description: `"${resumeName}" has been successfully imported.`,
        });
      }
    } catch {
      toast({
        title: "Invalid JSON",
        description: "Please check your JSON format and try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        const resumeName = parsed.personalInfo?.name
          ? `${parsed.personalInfo.name}'s Resume`
          : file.name.replace(".json", "");
        const result = await createResume({ name: resumeName, data: parsed });

        if (result.success && result.data) {
          setResumes((prev) => [result.data, ...prev]);
          setShowJsonDialog(false);
          toast({
            title: "Resume imported",
            description: "Your resume has been imported successfully.",
          });
        }
      } catch {
        toast({
          title: "Invalid JSON file",
          description: "Please verify that the uploaded file contains valid resume JSON.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="border-b border-border/80 bg-background/95 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <BrandLockup size="md" showTagline={false} />

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Import JSON modal trigger */}
              <Dialog open={showJsonDialog} onOpenChange={setShowJsonDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium border-border/80 hover:bg-neutral-100 dark:hover:bg-neutral-900 gap-1.5 cursor-pointer"
                  >
                    <FileJson className="h-3.5 w-3.5 text-neutral-400" />
                    <span className="hidden sm:inline">Import JSON</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl max-h-[90vh] flex flex-col bg-neutral-950 border-neutral-800 text-neutral-100">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold tracking-tight text-white">
                      Import Resume Data
                    </DialogTitle>
                    <p className="text-xs text-neutral-400 mt-1">
                      Upload a JSON file or paste structured resume data to import into Resume Studio.
                    </p>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto space-y-4 py-2 text-xs">
                    <div className="space-y-2">
                      <label
                        htmlFor="json-file-input"
                        className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider"
                      >
                        Upload JSON File
                      </label>
                      <div className="border border-dashed border-neutral-800 rounded-lg p-6 hover:border-neutral-700 transition-colors bg-neutral-900/30">
                        <div className="flex flex-col items-center justify-center text-center space-y-2">
                          <FileJson className="h-7 w-7 text-neutral-500" />
                          <p className="text-xs text-neutral-300">
                            Select a .json file exported from standard resume schemas
                          </p>
                          <Input
                            id="json-file-input"
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            className="cursor-pointer max-w-[220px] text-xs h-8 bg-neutral-900 border-neutral-800 mt-2"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="relative flex items-center justify-center py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-neutral-800" />
                      </div>
                      <span className="relative bg-neutral-950 px-3 text-[10px] uppercase tracking-widest text-neutral-500 font-medium">
                        or paste JSON
                      </span>
                    </div>

                    <div className="space-y-1">
                      <Textarea
                        placeholder='{"personalInfo": {"name": "Alex Morgan", "title": "Senior Engineer", ...}}'
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        className="min-h-[180px] font-mono text-xs leading-relaxed resize-none bg-neutral-900 border-neutral-800 text-neutral-200 focus-visible:ring-1 focus-visible:ring-neutral-400"
                        spellCheck={false}
                      />
                    </div>
                  </div>

                  <DialogFooter className="gap-2 border-t border-neutral-800 pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowJsonDialog(false);
                        setJsonInput("");
                      }}
                      className="text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleImportFromJson}
                      disabled={!jsonInput.trim()}
                      className="bg-white text-black hover:bg-neutral-200"
                    >
                      Import & Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Primary New Resume CTA */}
              <Button
                onClick={() => navigate("/resume/new")}
                size="sm"
                className="h-8 bg-white text-black hover:bg-neutral-200 font-medium text-xs gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Resume</span>
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
              Create your first professional resume using our interactive LaTeX studio, or import an
              existing JSON document.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={() => navigate("/resume/new")}
                className="bg-white text-black hover:bg-neutral-200 text-xs h-9 px-5 font-medium gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Resume</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowJsonDialog(true)}
                className="text-xs h-9 px-4 border-border cursor-pointer"
              >
                <FileJson className="w-3.5 h-3.5 mr-1 text-neutral-400" />
                Import JSON
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
              const candidateTitle = item.data?.personalInfo?.title || "Professional Resume";
              const candidateName = item.data?.personalInfo?.name;

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

                      <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        <span>{candidateTitle}{candidateName ? ` · ${candidateName}` : ""}</span>
                        <span className="text-neutral-300 dark:text-neutral-700 hidden sm:inline">•</span>
                        <span className="text-[11px] text-neutral-400 hidden sm:inline">
                          Updated {new Date(item.updatedAt).toLocaleDateString("en-US", {
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

                    <div className="flex items-center gap-1.5">
                      {/* Duplicate Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDuplicating === item.id}
                        onClick={() => handleDuplicateResume(item)}
                        className="h-8 px-2.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                        title="Duplicate Resume (creates clone of structured data and raw LaTeX)"
                      >
                        {isDuplicating === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                            <span>Duplicate</span>
                          </>
                        )}
                      </Button>

                      {/* Download PDF Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDownloading === item.id}
                        onClick={() => handleDownloadPDF(item)}
                        className="h-8 px-2.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                        title="Download compiled PDF"
                      >
                        {isDownloading === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            <span>PDF</span>
                          </>
                        )}
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

        {/* Rename Modal */}
        {resumeToRename && (
          <Dialog
            open={Boolean(resumeToRename)}
            onOpenChange={(open) => !open && setResumeToRename(null)}
          >
            <DialogContent className="max-w-md bg-neutral-950 border-neutral-800 text-white">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">Rename Resume</DialogTitle>
                <p className="text-xs text-neutral-400">
                  Update the display title for this resume.
                </p>
              </DialogHeader>
              <div className="py-2">
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="Enter resume name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmRename();
                  }}
                  className="h-9 text-xs bg-neutral-900 border-neutral-800 text-white"
                  autoFocus
                />
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
      </main>
    </div>
  );
}
