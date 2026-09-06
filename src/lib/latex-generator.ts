import type { ResumeData } from "@/types/resume";

export function generateLatex(data: ResumeData): string {
  // Extract fields with defaults
  const {
    personalInfo,
    summary,
    experience = [],
    education = [],
    skills = [],
    certifications = [],
    projects = [],
    languages = [],
  } = data || {};

  // Helper to escape LaTeX special characters
  // Order matters: we must not double-escape replacement strings.
  // Replace \ first, but use a placeholder so subsequent replacements
  // don't corrupt it.
  const escapeLatex = (str: string | undefined | null) => {
    if (!str) return "";
    return String(str)
      .replace(/\\/g, "\x00BACKSLASH\x00")
      .replace(/&/g, "\\&")
      .replace(/%/g, "\\%")
      .replace(/\$/g, "\\$")
      .replace(/#/g, "\\#")
      .replace(/_/g, "\\_")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}")
      .replace(/~/g, "\\textasciitilde{}")
      .replace(/\^/g, "\\textasciicircum{}")
      .replace(/\x00BACKSLASH\x00/g, "\\textbackslash{}");
  };

  let tex = `\\documentclass[10pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=0.5in]{geometry}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{xcolor}
\\setlength{\\parindent}{0pt}

\\usepackage[default]{lato}

% Color Definitions
\\definecolor{primary}{HTML}{2b2b2b}
\\definecolor{accent}{HTML}{003366}

% Style Settings
\\urlstyle{same}
\\pagestyle{empty}

\\titleformat{\\section}{\\large\\bfseries\\scshape\\raggedright}{}{0em}{}[\\titlerule]
\\titlespacing{\\section}{0pt}{7pt}{5pt}

\\begin{document}

% --- HEADER ---
\\begin{center}
    {\\Huge \\textbf{${escapeLatex(personalInfo?.name?.toUpperCase())}}} \\\\
    \\vspace{2pt}
    {\\color{accent} \\large ${escapeLatex(personalInfo?.title)}} \\\\
    \\vspace{4pt}
    \\small 
    ${escapeLatex(personalInfo?.phone)} \\ $|$ \\ 
    \\href{mailto:${escapeLatex(personalInfo?.email)}}{${escapeLatex(personalInfo?.email)}} \\ $|$ \\ 
    ${personalInfo?.linkedin ? `\\href{https://${escapeLatex(personalInfo.linkedin.replace(/^https?:\/\//, ""))}}{${escapeLatex(personalInfo.linkedin.replace(/^https?:\/\//, ""))}} \\ $|$ \\ ` : ""}
    ${escapeLatex(personalInfo?.location)}
\\end{center}
`;

  if (summary) {
    tex += `\n% --- SUMMARY ---\n\\section{Summary}\n${escapeLatex(summary)}\n`;
  }

  const filteredSkills = (skills || []).filter((s) => s.trim());
  if (filteredSkills.length > 0) {
    tex += `\n% --- SKILLS ---\n\\section{Technical Skills}\n`;
    tex += `\\begin{itemize}[leftmargin=0.15in, labelsep=0.5em, itemsep=-2pt]\n`;
    tex += `    \\item ${escapeLatex(filteredSkills.join(", "))}\n`;
    tex += `\\end{itemize}\n`;
  }

  if (experience && experience.length > 0) {
    tex += `\n% --- EXPERIENCE ---\n\\section{Professional Experience}\n`;
    experience.forEach((exp) => {
      tex += `\\textbf{${escapeLatex(exp.company)}} \\hfill ${escapeLatex(exp.location)} \\\\\n`;
      tex += `\\textit{${escapeLatex(exp.title)}} \\hfill ${escapeLatex(exp.startDate)} -- ${escapeLatex(exp.endDate)}\n`;
      if (exp.description && exp.description.trim()) {
        tex += `\\\\\n${escapeLatex(exp.description)}\n`;
      }
      const filteredResps = (exp.responsibilities || []).filter((r) => r.trim());
      if (filteredResps.length > 0) {
        tex += `\\begin{itemize}[noitemsep, topsep=2pt]\n`;
        filteredResps.forEach((resp) => {
          tex += `    \\item ${escapeLatex(resp)}\n`;
        });
        tex += `\\end{itemize}\n`;
      }
      tex += `\n`;
    });
  }

  if (certifications && certifications.length > 0) {
    tex += `% --- CERTIFICATIONS ---\n\\section{Certifications}\n`;
    tex += `\\begin{itemize}[leftmargin=0.15in, labelsep=0.5em, itemsep=-2pt]\n`;
    certifications.forEach((cert) => {
      let certLine = `    \\item \\textbf{${escapeLatex(cert.title)}}`;
      if (cert.issuer) certLine += ` | \\textit{${escapeLatex(cert.issuer)}}`;
      if (cert.date) certLine += ` \\hfill ${escapeLatex(cert.date)}`;
      tex += certLine + `\n`;
      if (cert.link && cert.link.trim()) {
        tex += `    \\href{${escapeLatex(cert.link)}}{View Credential}\n`;
      }
      if (cert.skills && cert.skills.trim()) {
        tex += `    \\textit{Skills: ${escapeLatex(cert.skills)}}\n`;
      }
    });
    tex += `\\end{itemize}\n`;
  }

  if (projects && projects.length > 0) {
    tex += `\n% --- PROJECTS ---\n\\section{Key Projects}\n`;
    projects.forEach((proj) => {
      tex += `\\textbf{${escapeLatex(proj.title)}}`;
      if (proj.technologies) {
        tex += ` $|$ \\textit{${escapeLatex(proj.technologies)}}`;
      }
      tex += `\n`;
      if (proj.description) {
        tex += `\\begin{itemize}[noitemsep, topsep=0pt]\n`;
        // Split description by newlines for multiple bullet points
        const descLines = proj.description.split("\n").filter((l) => l.trim());
        if (descLines.length > 1) {
          descLines.forEach((line) => {
            tex += `    \\item ${escapeLatex(line)}\n`;
          });
        } else {
          tex += `    \\item ${escapeLatex(proj.description)}\n`;
        }
        tex += `\\end{itemize}\n`;
      }
      tex += `\n`;
    });
  }

  if (education && education.length > 0) {
    tex += `% --- EDUCATION ---\n\\section{Education}\n`;
    education.forEach((edu) => {
      tex += `\\textbf{${escapeLatex(edu.institution)}} \\hfill ${escapeLatex(edu.startDate)} -- ${escapeLatex(edu.endDate)} \\\\\n`;
      tex += `${escapeLatex(edu.degree)} \\hfill ${escapeLatex(edu.location)}\n\n`;
    });
  }

  if (languages && languages.length > 0) {
    tex += `% --- LANGUAGES ---\n\\section{Languages}\n`;
    const langStrings = languages.map(
      (lang) => `\\textbf{${escapeLatex(lang.name)}} (${escapeLatex(lang.level)})`
    );
    tex += `${langStrings.join(", ")}\n`;
  }

  tex += `\n\\end{document}\n`;

  return tex;
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
