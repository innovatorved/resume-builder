"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Copy,
  FileJson,
  MoreHorizontal,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { downloadResumeLatex, downloadCompiledPdf } from "@/lib/latex-generator";
import type { ResumeData } from "@/types/resume";
import { createResume, updateResume, deleteResume, duplicateResume } from "@/lib/actions/resume";
import { useRouter } from "next/navigation";
import { AuthNav } from "@/components/auth-nav";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const handleDeleteResume = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resume?")) return;

    try {
      const result = await deleteResume(id);
      if (result.success) {
        setResumes(resumes.filter((r) => r.id !== id));
        toast({
          title: "Resume deleted",
          description: "Your resume has been removed.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete resume",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete resume",
        variant: "destructive",
      });
    }
  };

  const handleRenameResume = async (id: string) => {
    if (!newName.trim()) return;

    try {
      const result = await updateResume({ id, name: newName });
      if (result.success && result.data) {
        setResumes(resumes.map((r) => (r.id === id ? result.data! : r)));
        setEditingName(null);
        toast({
          title: "Resume renamed",
          description: `Resume renamed to "${newName}"`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to rename resume",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename resume",
        variant: "destructive",
      });
    }
  };

  const handleCopyResume = async (resume: Resume) => {
    try {
      const result = await duplicateResume(resume.id);
      if (result.success && result.data) {
        setResumes([...resumes, result.data]);
        toast({
          title: "Resume copied",
          description: `Created "${result.data.name}".`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to copy resume",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy resume",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async (resume: Resume) => {
    setIsDownloading(resume.id);
    try {
      await downloadCompiledPdf(resume.data);
      toast({
        title: "Resume downloaded",
        description: "Your PDF file has been generated successfully.",
      });
    } catch (error) {
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
      const resumeName = parsed.personalInfo?.name || "Imported Resume";
      const result = await createResume({ name: resumeName, data: parsed });

      if (result.success && result.data) {
        setResumes([...resumes, result.data]);
        setShowJsonDialog(false);
        setJsonInput("");
        toast({
          title: "Resume imported",
          description: "Your resume has been imported successfully.",
        });
      }
    } catch (error) {
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
        const resumeName = parsed.personalInfo?.name || file.name.replace(".json", "");
        const result = await createResume({ name: resumeName, data: parsed });

        if (result.success && result.data) {
          setResumes([...resumes, result.data]);
          setShowJsonDialog(false);
          toast({
            title: "Resume imported",
            description: "Your resume has been imported successfully.",
          });
        }
      } catch (error) {
        toast({
          title: "Invalid JSON file",
          description: "Please check your JSON file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <h1
              className="text-lg sm:text-2xl text-foreground font-semibold tracking-tight truncate"
              style={{ fontFamily: "var(--font-sans-heading)" }}
            >
              Resume Builder
            </h1>
            <div className="flex items-center gap-2 sm:gap-5 flex-shrink-0">
              <Dialog open={showJsonDialog} onOpenChange={setShowJsonDialog}>
                <DialogTrigger asChild>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border hover:decoration-foreground hidden sm:inline">
                    Import JSON
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle
                      className="text-xl font-semibold"
                      style={{ fontFamily: "var(--font-sans-heading)" }}
                    >
                      Import Resume
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload a JSON file or paste your resume data below.
                    </p>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto space-y-6 py-4">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground uppercase tracking-wide">
                        Upload file
                      </label>
                      <div className="border-2 border-dashed border-border p-8 hover:border-primary/50 transition-colors">
                        <div className="flex flex-col items-center justify-center text-center space-y-2">
                          <FileJson className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Click to browse or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground/60">.json files only</p>
                          <Input
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            className="cursor-pointer max-w-[200px] mt-2"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-popover px-3 text-muted-foreground tracking-wider">
                          or paste JSON
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Textarea
                        placeholder='{"personalInfo": {"name": "Your Name", ...}}'
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        className="min-h-[280px] font-mono text-xs leading-relaxed resize-none border-border focus:border-primary"
                        spellCheck={false}
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowJsonDialog(false);
                        setJsonInput("");
                      }}
                      className="border-border"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleImportFromJson}
                      disabled={!jsonInput.trim()}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Import
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                onClick={() => router.push("/resume/new")}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs sm:text-sm"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">New Resume</span>
                <span className="sm:hidden">New</span>
              </Button>
              <AuthNav />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {resumes.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
            <h2
              className="text-4xl text-foreground mb-4 font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-sans-heading)" }}
            >
              No resumes yet
            </h2>
            <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
              Create your first professional resume or import an existing one to get started.
            </p>
            <Button
              onClick={() => router.push("/resume/new")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base font-medium"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Resume
            </Button>
          </div>
        ) : (
          /* Resume list */
          <div className="max-w-4xl">
            <p className="text-sm text-muted-foreground mb-8 uppercase tracking-widest">
              {resumes.length} resume{resumes.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-0">
              {resumes.map((resume, index) => (
                <div
                  key={resume.id}
                  className={`group py-5 ${
                    index !== resumes.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  {editingName === resume.id ? (
                    <div className="flex gap-3 items-center">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") handleRenameResume(resume.id);
                        }}
                        className="h-10 text-base border-0 border-b-2 border-border rounded-none bg-transparent focus:border-primary focus-visible:ring-0 flex-1"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleRenameResume(resume.id)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingName(null)}
                        className="text-muted-foreground"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-xl text-foreground truncate font-semibold cursor-pointer hover:text-primary transition-colors"
                          style={{ fontFamily: "var(--font-sans-heading)" }}
                          onClick={() => router.push(`/resume/${resume.id}`)}
                        >
                          {resume.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Updated{" "}
                          {new Date(resume.updatedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => router.push(`/resume/${resume.id}`)}
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/resume/${resume.id}/preview`)}
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(resume)}
                          disabled={isDownloading === resume.id}
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                          title="Download PDF"
                        >
                          {isDownloading === resume.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCopyResume(resume)}
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingName(resume.id);
                            setNewName(resume.name);
                          }}
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                          title="Rename"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteResume(resume.id)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
