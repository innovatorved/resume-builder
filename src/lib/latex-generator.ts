import { generateCleanModern } from "@/lib/templates";
import type { ResumeData } from "@/types/resume";

export function generateLatex(data: ResumeData): string {
  return generateCleanModern(data);
}

export async function downloadResumeLatex(data: ResumeData, filename: string = "resume.tex") {
  const texContent = generateLatex(data);
  const blob = new Blob([texContent], { type: "application/x-latex;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  // If the resume has a name, use it for the file name, otherwise fallback to "resume.tex"
  const safeName = data.personalInfo?.name
    ? data.personalInfo.name.toLowerCase().replace(/\\s+/g, "-") + "-resume.tex"
    : filename;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadCompiledPdf(data: ResumeData, filename: string = "resume.pdf") {
  const response = await fetch("/api/generate-pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to compile PDF");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  const safeName = data.personalInfo?.name
    ? data.personalInfo.name.toLowerCase().replace(/\\s+/g, "-") + "-resume.pdf"
    : filename;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
