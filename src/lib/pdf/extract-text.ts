/**
 * Utility to extract clean, structured text from uploaded resume documents.
 * Supports PDF (via pdfjs-dist), LaTeX (.tex), Markdown (.md), Plain Text (.txt), and JSON resumes.
 */

let workerConfigured = false;

async function getPdfJs() {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (typeof window !== "undefined" && !workerConfigured) {
    try {
      // Configure worker for browser runtime
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      workerConfigured = true;
    } catch {
      // Fallback to workerless if network restricted
    }
  }
  return pdfjsLib;
}

export interface ExtractedResume {
  name: string;
  text: string;
  fileType: "pdf" | "latex" | "markdown" | "text" | "json";
  pageCount?: number;
  rawJson?: Record<string, unknown>;
}

/**
 * Format PDF text items into coherent paragraphs and bullet points
 * by checking Y-coordinate jumps between text chunks.
 */
function formatPdfTextItems(items: Array<{ str?: string; transform?: number[] }>): string {
  const lines: string[] = [];
  let currentLine: string[] = [];
  let lastY: number | null = null;

  for (const item of items) {
    if (!item.str || !item.str.trim()) continue;
    const y = item.transform ? item.transform[5] : null;

    if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
      if (currentLine.length > 0) {
        lines.push(currentLine.join(" "));
        currentLine = [];
      }
      if (Math.abs(y - lastY) > 14) {
        lines.push(""); // Blank line between distinct paragraphs / sections
      }
    }

    currentLine.push(item.str.trim());
    if (y !== null) lastY = y;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine.join(" "));
  }

  return lines.join("\n");
}

/**
 * Extracts text from PDF files using pdfjs-dist
 */
export async function extractTextFromPdf(file: File): Promise<{ text: string; pageCount: number }> {
  const pdfjsLib = await getPdfJs();
  const buffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  const doc = await loadingTask.promise;
  const pageCount = doc.numPages;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const formatted = formatPdfTextItems(content.items as Array<{ str?: string; transform?: number[] }>);
    if (formatted.trim()) {
      pageTexts.push(formatted.trim());
    }
  }

  const combined = pageTexts.join("\n\n---\n\n");
  if (!combined.trim()) {
    throw new Error(
      "No readable text found in this PDF. If it's a scanned image, please upload a searchable PDF or plain text/LaTeX."
    );
  }

  return { text: combined, pageCount };
}

/**
 * Parses JSON Resume schema into clean Markdown
 */
function formatJsonResume(data: Record<string, unknown>): string {
  const sections: string[] = [];

  // Basics
  const basics = data.basics as Record<string, unknown> | undefined;
  if (basics) {
    sections.push(`# ${basics.name || "Resume"}\n${basics.label || ""}\n${basics.summary || ""}`);
    const contact = [basics.email, basics.phone, basics.url].filter(Boolean).join(" | ");
    if (contact) sections.push(`**Contact:** ${contact}`);
  }

  // Work experience
  const work = Array.isArray(data.work) ? data.work : [];
  if (work.length > 0) {
    const items = work.map((w: Record<string, unknown>) => {
      const title = `${w.position || "Role"} at ${w.name || w.company || "Company"}`;
      const dates = `${w.startDate || ""} - ${w.endDate || "Present"}`;
      const summary = w.summary ? `\n${w.summary}` : "";
      const highlights = Array.isArray(w.highlights) ? `\n${w.highlights.map((h) => `- ${h}`).join("\n")}` : "";
      return `### ${title} (${dates})${summary}${highlights}`;
    });
    sections.push(`## Experience\n\n${items.join("\n\n")}`);
  }

  // Education
  const edu = Array.isArray(data.education) ? data.education : [];
  if (edu.length > 0) {
    const items = edu.map((e: Record<string, unknown>) => {
      return `### ${e.institution || "Institution"}\n${e.studyType || ""} in ${e.area || ""} (${e.startDate || ""} - ${e.endDate || ""})`;
    });
    sections.push(`## Education\n\n${items.join("\n\n")}`);
  }

  // Skills
  const skills = Array.isArray(data.skills) ? data.skills : [];
  if (skills.length > 0) {
    const items = skills.map((s: Record<string, unknown>) => {
      const keywords = Array.isArray(s.keywords) ? `: ${s.keywords.join(", ")}` : "";
      return `- **${s.name || "Skill"}**${keywords}`;
    });
    sections.push(`## Skills\n\n${items.join("\n")}`);
  }

  return sections.length > 0 ? sections.join("\n\n") : JSON.stringify(data, null, 2);
}

/**
 * Universal resume parser that supports PDF, LaTeX, Markdown, Text, and JSON.
 */
export async function extractResumeText(file: File): Promise<ExtractedResume> {
  const fileName = file.name.toLowerCase();

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File is too large. Please upload a document under 10 MB.");
  }

  if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
    const { text, pageCount } = await extractTextFromPdf(file);
    return {
      name: file.name,
      text,
      fileType: "pdf",
      pageCount,
    };
  }

  if (
    fileName.endsWith(".tex") ||
    file.type === "application/x-latex" ||
    file.type === "text/x-tex"
  ) {
    const text = await file.text();
    return {
      name: file.name,
      text,
      fileType: "latex",
    };
  }

  if (fileName.endsWith(".json") || file.type === "application/json") {
    try {
      const json = JSON.parse(await file.text()) as Record<string, unknown>;
      const text = formatJsonResume(json);
      return {
        name: file.name,
        text,
        fileType: "json",
        rawJson: json,
      };
    } catch {
      const text = await file.text();
      return { name: file.name, text, fileType: "text" };
    }
  }

  if (fileName.endsWith(".md") || fileName.endsWith(".markdown") || file.type === "text/markdown") {
    const text = await file.text();
    return {
      name: file.name,
      text,
      fileType: "markdown",
    };
  }

  // Plain text fallback (.txt or any other text file)
  const text = await file.text();
  return {
    name: file.name,
    text,
    fileType: "text",
  };
}

/**
 * Converts an extracted resume into structured ResumeData for immediate editor use.
 */
export function extractedResumeToResumeData(extracted: ExtractedResume): import("@/types/resume").ResumeData {
  const baseName = extracted.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

  if (extracted.rawJson) {
    const raw = extracted.rawJson;
    if (raw.personalInfo && typeof raw.personalInfo === "object") {
      const p = raw.personalInfo as Record<string, unknown>;
      return {
        personalInfo: {
          name: String(p.name || baseName),
          title: String(p.title || ""),
          phone: String(p.phone || ""),
          email: String(p.email || ""),
          linkedin: String(p.linkedin || ""),
          location: String(p.location || ""),
        },
        summary: String(raw.summary || ""),
        experience: Array.isArray(raw.experience) ? (raw.experience as any) : [],
        education: Array.isArray(raw.education) ? (raw.education as any) : [],
        skills: Array.isArray(raw.skills) ? (raw.skills as any) : [],
        certifications: Array.isArray(raw.certifications) ? (raw.certifications as any) : [],
        projects: Array.isArray(raw.projects) ? (raw.projects as any) : [],
        languages: Array.isArray(raw.languages) ? (raw.languages as any) : [],
      };
    }

    if (raw.basics && typeof raw.basics === "object") {
      const basics = raw.basics as Record<string, any>;
      const profiles = Array.isArray(basics.profiles) ? basics.profiles : [];
      const linkedinProfile = profiles.find((p: any) =>
        String(p.network || "").toLowerCase().includes("linkedin")
      );

      const locationStr =
        typeof basics.location === "string"
          ? basics.location
          : basics.location && typeof basics.location === "object"
            ? [basics.location.city, basics.location.region].filter(Boolean).join(", ")
            : "";

      return {
        personalInfo: {
          name: String(basics.name || baseName),
          title: String(basics.label || ""),
          phone: String(basics.phone || ""),
          email: String(basics.email || ""),
          linkedin: linkedinProfile?.url || basics.url || "",
          location: locationStr,
        },
        summary: String(basics.summary || ""),
        experience: Array.isArray(raw.work)
          ? raw.work.map((w: any) => ({
              title: String(w.position || ""),
              company: String(w.name || w.company || ""),
              location: String(w.location || ""),
              startDate: String(w.startDate || ""),
              endDate: String(w.endDate || "Present"),
              description: String(w.summary || ""),
              responsibilities: Array.isArray(w.highlights) ? w.highlights.map(String) : [],
            }))
          : [],
        education: Array.isArray(raw.education)
          ? raw.education.map((e: any) => ({
              degree: [e.studyType, e.area].filter(Boolean).join(" in ") || "Degree",
              institution: String(e.institution || ""),
              location: "",
              startDate: String(e.startDate || ""),
              endDate: String(e.endDate || ""),
            }))
          : [],
        skills: Array.isArray(raw.skills)
          ? raw.skills.flatMap((s: any) => [
              s.name,
              ...(Array.isArray(s.keywords) ? s.keywords : []),
            ]).filter(Boolean).map(String)
          : [],
        certifications: Array.isArray(raw.certificates)
          ? raw.certificates.map((c: any) => ({
              title: String(c.name || ""),
              issuer: String(c.issuer || ""),
              date: String(c.date || ""),
              link: String(c.url || ""),
            }))
          : [],
        projects: Array.isArray(raw.projects)
          ? raw.projects.map((pr: any) => ({
              title: String(pr.name || ""),
              description: String(pr.description || ""),
              technologies: Array.isArray(pr.keywords) ? pr.keywords.join(", ") : "",
            }))
          : [],
        languages: Array.isArray(raw.languages)
          ? raw.languages.map((l: any) => ({
              name: String(l.language || ""),
              level: String(l.fluency || ""),
            }))
          : [],
      };
    }
  }

  const text = extracted.text;
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : "";

  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : "";

  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  const linkedin = linkedinMatch ? linkedinMatch[0] : "";

  let candidateName = baseName;
  if (lines.length > 0) {
    const first = lines[0].replace(/^#+\s*/, "").trim();
    if (first.length > 2 && first.length < 50 && !first.includes("@") && !first.toLowerCase().includes("resume")) {
      candidateName = first;
    }
  }

  return {
    personalInfo: {
      name: candidateName,
      title: "",
      phone,
      email,
      linkedin,
      location: "",
    },
    summary: lines.slice(1, 4).join(" ").slice(0, 500),
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
    languages: [],
  };
}
