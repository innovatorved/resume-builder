"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Download,
  FileText,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Copy,
  FileJson,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { downloadResumePdf } from "@/lib/download-resume-v2";
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

interface ResumeListProps {
  initialResumes: Resume[];
}

export function ResumeList({ initialResumes }: ResumeListProps) {
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
      await downloadResumePdf(resume.data);
      toast({
        title: "Resume downloaded",
        description: "Your PDF has been generated successfully.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to generate PDF. Please try again.",
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950">
      <header className="border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                <Image
                  src="/refresh.svg"
                  alt="Resume Builder"
                  width={32}
                  height={32}
                  style={{
                    filter:
                      "brightness(0) saturate(100%) invert(40%) sepia(100%) saturate(2500%) hue-rotate(195deg) brightness(95%) contrast(90%)",
                  }}
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resume Builder</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create professional resumes in minutes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Dialog open={showJsonDialog} onOpenChange={setShowJsonDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="border-2">
                    <FileJson className="mr-2 h-5 w-5" />
                    Import JSON
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Import Resume from JSON</DialogTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Upload a JSON file or paste your resume data below
                    </p>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto space-y-6 py-4">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <FileJson className="h-4 w-4 text-blue-600" />
                        Upload JSON File
                      </label>
                      <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-6 bg-blue-50 dark:bg-blue-950/20 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                        <div className="flex flex-col items-center justify-center text-center space-y-3">
                          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                            <FileJson className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Click to browse or drag and drop
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Accepts .json files only
                            </p>
                          </div>
                          <Input
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            className="cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300 dark:border-gray-700" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-slate-900 px-3 text-gray-500 dark:text-gray-400 font-semibold">
                          Or paste JSON data
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Paste JSON Content
                      </label>
                      <Textarea
                        placeholder='{"personalInfo": {"name": "Your Name", ...}}'
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        className="min-h-[350px] font-mono text-xs leading-relaxed resize-none border-2 focus:border-blue-500 dark:focus:border-blue-400"
                        spellCheck={false}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Paste your resume JSON data here. Make sure it's valid JSON format.
                      </p>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowJsonDialog(false);
                        setJsonInput("");
                      }}
                      className="min-w-[100px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleImportFromJson}
                      disabled={!jsonInput.trim()}
                      className="min-w-[120px] bg-blue-600 hover:bg-blue-700"
                    >
                      <FileJson className="mr-2 h-4 w-4" />
                      Import Resume
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                onClick={() => router.push("/resume/new")}
                size="lg"
                className="bg-blue-700 hover:bg-blue-800 text-white shadow-lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create New
              </Button>
              <AuthNav />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {resumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-6 bg-blue-50 dark:bg-slate-800 rounded-full mb-6">
              <Image
                src="/refresh.svg"
                alt="No resumes"
                width={64}
                height={64}
                style={{
                  filter:
                    "brightness(0) saturate(100%) invert(40%) sepia(100%) saturate(2500%) hue-rotate(195deg) brightness(95%) contrast(90%)",
                }}
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No resumes yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
              Create your first professional resume or import an existing one
            </p>
            <Button
              onClick={() => router.push("/resume/new")}
              size="lg"
              className="bg-blue-700 hover:bg-blue-800"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Resume
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              <Card key={resume.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  {editingName === resume.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") handleRenameResume(resume.id);
                        }}
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleRenameResume(resume.id)}>
                        Save
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-lg">{resume.name}</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingName(resume.id);
                          setNewName(resume.name);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <p className="text-sm text-gray-500">
                    Updated {new Date(resume.updatedAt).toLocaleDateString()}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/resume/${resume.id}`)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/resume/${resume.id}/preview`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadPDF(resume)}
                      disabled={isDownloading === resume.id}
                    >
                      {isDownloading === resume.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleCopyResume(resume)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-500"
                      onClick={() => handleDeleteResume(resume.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
