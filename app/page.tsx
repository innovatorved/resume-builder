"use client";

import { useState, useEffect } from "react";
import { TypeformResumeBuilder } from "@/components/typeform-resume-builder";
import { ResumePreview } from "@/components/resume-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Download,
  FileText,
  ArrowLeft,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  FileJson,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { downloadResumePdf } from "@/lib/download-resume-v2";
import { DOWNLOAD_BUTTON_BASE_CLASSES } from "@/lib/utils";
import type { ResumeData } from "@/types/resume";

interface SavedResume {
  id: string;
  name: string;
  data: ResumeData;
  createdAt: string;
  updatedAt: string;
}

const EMPTY_RESUME: ResumeData = {
  personalInfo: {
    name: "",
    title: "",
    phone: "",
    email: "",
    linkedin: "",
    location: "",
  },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  languages: [],
};

export default function Home() {
  const [view, setView] = useState<"home" | "form" | "preview">("home");
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const { toast } = useToast();
  const [resumeData, setResumeData] = useState<ResumeData>(EMPTY_RESUME);

  // Load resumes from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("savedResumes");
    if (stored) {
      try {
        setSavedResumes(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to load resumes:", error);
      }
    }
  }, []);

  // Save resumes to localStorage whenever they change
  useEffect(() => {
    if (savedResumes.length > 0) {
      localStorage.setItem("savedResumes", JSON.stringify(savedResumes));
    }
  }, [savedResumes]);

  const createNewResume = (name: string, data: ResumeData) => {
    const newResume: SavedResume = {
      id: Date.now().toString(),
      name,
      data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSavedResumes([...savedResumes, newResume]);
    return newResume.id;
  };

  const updateResume = (id: string, data: ResumeData) => {
    setSavedResumes(
      savedResumes.map((r) =>
        r.id === id ? { ...r, data, updatedAt: new Date().toISOString() } : r
      )
    );
  };

  const deleteResume = (id: string) => {
    setSavedResumes(savedResumes.filter((r) => r.id !== id));
    toast({
      title: "Resume deleted",
      description: "Your resume has been removed.",
    });
  };

  const renameResume = (id: string, newName: string) => {
    setSavedResumes(
      savedResumes.map((r) =>
        r.id === id ? { ...r, name: newName, updatedAt: new Date().toISOString() } : r
      )
    );
    setEditingName(null);
    toast({
      title: "Resume renamed",
      description: `Resume renamed to "${newName}"`,
    });
  };

  const handleStartNewFormResume = () => {
    setResumeData(EMPTY_RESUME);
    setCurrentResumeId(null);
    setView("form");
  };

  const handleImportFromJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const resumeName = parsed.personalInfo?.name || "Imported Resume";
      const newId = createNewResume(resumeName, parsed);
      setShowJsonDialog(false);
      setJsonInput("");
      toast({
        title: "Resume imported",
        description: "Your resume has been imported successfully.",
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please check your JSON format and try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        const resumeName = parsed.personalInfo?.name || file.name.replace(".json", "");
        createNewResume(resumeName, parsed);
        setShowJsonDialog(false);
        setJsonInput("");
        toast({
          title: "Resume imported",
          description: "Your resume has been imported successfully from file.",
        });
      } catch (error) {
        toast({
          title: "Invalid JSON file",
          description: "Please check your JSON file format and try again.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be selected again
    event.target.value = "";
  };

  const handleEditResume = (resume: SavedResume) => {
    setResumeData(resume.data);
    setCurrentResumeId(resume.id);
    setView("form");
  };

  const handleViewResume = (resume: SavedResume) => {
    setResumeData(resume.data);
    setCurrentResumeId(resume.id);
    setView("preview");
  };

  const handleFormComplete = () => {
    if (currentResumeId) {
      updateResume(currentResumeId, resumeData);
    } else {
      const resumeName = resumeData.personalInfo.name || "New Resume";
      createNewResume(resumeName, resumeData);
    }
    setView("home");
    toast({
      title: "Resume saved",
      description: "Your resume has been saved successfully.",
    });
  };

  const handleDownloadPDF = async (resume: SavedResume) => {
    setIsDownloading(resume.id);
    try {
      await downloadResumePdf(resume.data);
      toast({
        title: "Resume downloaded",
        description: "Your PDF has been generated successfully.",
      });
    } catch (error) {
      console.error("[download] Failed to generate resume PDF", error);
      toast({
        title: "Download failed",
        description: "We couldn't generate your resume PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  // Form View
  if (view === "form") {
    return (
      <TypeformResumeBuilder
        data={resumeData}
        onChange={setResumeData}
        onComplete={handleFormComplete}
      />
    );
  }

  // Preview View
  if (view === "preview") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950">
        <header className="border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-40 shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  onClick={() => setView("home")}
                  variant="outline"
                  size="sm"
                  className="border-2 border-gray-300 dark:border-gray-600 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-2 bg-blue-700 rounded-lg flex-shrink-0">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-lg md:text-xl font-bold text-blue-700 dark:text-blue-500 truncate">
                    Resume Preview
                  </h1>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  onClick={() => setView("form")}
                  variant="outline"
                  size="default"
                  className="hidden sm:flex"
                >
                  <Edit2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button
                  onClick={() => setView("form")}
                  variant="outline"
                  size="icon"
                  className="sm:hidden"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => {
                    if (currentResumeId) {
                      const resume = savedResumes.find((r) => r.id === currentResumeId);
                      if (resume) handleDownloadPDF(resume);
                    }
                  }}
                  className="bg-blue-700 hover:bg-blue-800 text-white shadow-lg flex-shrink-0"
                  size="default"
                  disabled={isDownloading !== null}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                      <span className="hidden sm:inline">Preparing...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Download</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
            <div className="p-6">
              <ResumePreview data={resumeData} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Home View - Resume Management
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950">
      <header className="border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-700 rounded-xl shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resume Builder</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage and create your professional resumes
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Dialog open={showJsonDialog} onOpenChange={setShowJsonDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"
                  >
                    <FileJson className="mr-2 h-5 w-5" />
                    Import JSON
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Import Resume from JSON</DialogTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Upload a JSON file or paste your resume data
                    </p>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto space-y-6 py-2 pr-2">
                    {/* File Upload Section */}
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
                            accept=".json,application/json"
                            onChange={handleFileUpload}
                            className="cursor-pointer file:mr-4 file:py-1 file:px-5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300 dark:border-gray-600" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-slate-900 px-3 py-1 text-gray-500 dark:text-gray-400 font-medium rounded-full">
                          Or paste JSON
                        </span>
                      </div>
                    </div>

                    {/* Paste JSON Section */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        Paste JSON Content
                      </label>
                      <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-colors">
                        <Textarea
                          placeholder={`{
  "personalInfo": {
    "name": "Your Name",
    "title": "Your Title",
    ...
  },
  "experience": [...],
  ...
}`}
                          value={jsonInput}
                          onChange={(e) => setJsonInput(e.target.value)}
                          className="min-h-[280px] font-mono text-xs resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-gray-50 dark:bg-gray-900/50 whitespace-pre"
                          spellCheck={false}
                        />
                      </div>
                      <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="mt-0.5">💡</span>
                        <p>
                          Paste the complete JSON structure of your resume. Make sure it follows the
                          correct format.
                        </p>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="mt-4 gap-2">
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
                      Import JSON
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                onClick={handleStartNewFormResume}
                size="lg"
                className="bg-blue-700 hover:bg-blue-800 text-white shadow-lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create New Resume
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {savedResumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-6 bg-blue-100 dark:bg-blue-900/20 rounded-full mb-6">
              <FileText className="h-16 w-16 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No Resumes Yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
              Start by creating your first resume or import one from JSON
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleStartNewFormResume}
                size="lg"
                className="bg-blue-700 hover:bg-blue-800 text-white"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Resume
              </Button>
              <Button onClick={() => setShowJsonDialog(true)} variant="outline" size="lg">
                <FileJson className="mr-2 h-5 w-5" />
                Import JSON
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedResumes.map((resume) => (
              <Card
                key={resume.id}
                className="p-6 hover:shadow-xl transition-shadow border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {editingName === resume.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="text-lg font-semibold"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              renameResume(resume.id, newName);
                            } else if (e.key === "Escape") {
                              setEditingName(null);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {resume.name}
                        <button
                          onClick={() => {
                            setEditingName(resume.id);
                            setNewName(resume.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-blue-600 transition-opacity"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </h3>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Updated {new Date(resume.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {resume.data.personalInfo.title || "No title"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {resume.data.experience.length} experiences • {resume.data.education.length}{" "}
                    education
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleViewResume(resume)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button
                      onClick={() => handleEditResume(resume)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownloadPDF(resume)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={isDownloading === resume.id}
                    >
                      {isDownloading === resume.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this resume?")) {
                          deleteResume(resume.id);
                        }
                      }}
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
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
