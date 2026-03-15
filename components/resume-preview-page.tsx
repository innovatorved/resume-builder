"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ResumePreview } from "@/components/resume-preview";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { downloadResumeLatex, downloadCompiledPdf } from "@/lib/latex-generator";
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
      await downloadCompiledPdf(resume.data);
      toast({
        title: "Resume downloaded",
        description: "Your compiled PDF file has been generated successfully.",
      });
    } catch (error) {
      toast({
        title: "Compilation failed",
        description: "Failed to compile LaTeX to PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>

            <h1
              className="text-lg font-medium text-foreground truncate font-semibold"
              style={{ fontFamily: "var(--font-sans-heading)" }}
            >
              {resume.name}
            </h1>

            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading…
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

      <main className="container mx-auto px-4 py-10 md:py-16">
        <div className="max-w-4xl mx-auto bg-white shadow-lg overflow-hidden border border-border">
          <div className="p-6">
            <ResumePreview data={resume.data} />
          </div>
        </div>
      </main>
    </div>
  );
}
