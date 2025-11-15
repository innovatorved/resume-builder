"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ResumePreview } from "@/components/resume-preview";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { downloadResumePdf } from "@/lib/download-resume-v2";
import type { ResumeData } from "@/types/resume";

interface ResumePreviewPageProps {
  resume: {
    id: string;
    name: string;
    data: ResumeData;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
}

export function ResumePreviewPage({ resume }: ResumePreviewPageProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleDownload = async () => {
    setIsDownloading(true);
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
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950">
      <header className="border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Button onClick={() => router.push("/")} variant="outline" size="default">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Resumes
            </Button>

            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {resume.name}
            </h1>

            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-blue-700 hover:bg-blue-800"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
          <div className="p-6">
            <ResumePreview data={resume.data} />
          </div>
        </div>
      </main>
    </div>
  );
}
