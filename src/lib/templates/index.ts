import { escapeLatex } from "@/lib/latex/escape";
import type { ResumeData } from "@/types/resume";

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  engine: "pdftex" | "xelatex";
  generate: (data: ResumeData) => string;
}

export function generateCleanModern(data: ResumeData): string {
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

  let tex = `\\documentclass[10pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=0.5in]{geometry}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{xcolor}
\\setlength{\\parindent}{0pt}

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
    {\\Huge \\textbf{${escapeLatex(personalInfo?.name?.toUpperCase() || "YOUR NAME")}}} \\\\
    \\vspace{2pt}
    {\\color{accent} \\large ${escapeLatex(personalInfo?.title || "Professional Title")}} \\\\
    \\vspace{4pt}
    \\small 
    ${personalInfo?.phone ? `${escapeLatex(personalInfo.phone)} \\ $|$ \\ ` : ""}
    ${personalInfo?.email ? `\\href{mailto:${escapeLatex(personalInfo.email)}}{${escapeLatex(personalInfo.email)}} \\ $|$ \\ ` : ""}
    ${personalInfo?.linkedin ? `\\href{https://${escapeLatex(personalInfo.linkedin.replace(/^https?:\/\//, ""))}}{${escapeLatex(personalInfo.linkedin.replace(/^https?:\/\//, ""))}} \\ $|$ \\ ` : ""}
    ${escapeLatex(personalInfo?.location || "")}
\\end{center}
`;

  if (summary?.trim()) {
    tex += `\n% --- SUMMARY ---\n\\section{Summary}\n${escapeLatex(summary)}\n`;
  }

  const filteredSkills = (skills || []).filter((s) => s?.trim());
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
      tex += `\\textit{${escapeLatex(exp.title)}} \\hfill ${escapeLatex(exp.startDate || "")} -- ${escapeLatex(exp.endDate)} \\\\\n`;
      if (exp.description?.trim()) {
        tex += `${escapeLatex(exp.description)}\n`;
      }
      const filteredResps = (exp.responsibilities || []).filter((r) => r?.trim());
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
      tex += `\\textbf{${escapeLatex(edu.institution)}} \\hfill ${escapeLatex(edu.startDate || "")} -- ${escapeLatex(edu.endDate)} \\\\\n`;
      tex += `${escapeLatex(edu.degree)} \\hfill ${escapeLatex(edu.location)}\n\n`;
    });
  }

  if (certifications && certifications.length > 0) {
    tex += `% --- CERTIFICATIONS ---\n\\section{Certifications}\n`;
    tex += `\\begin{itemize}[leftmargin=0.15in, labelsep=0.5em, itemsep=-2pt]\n`;
    certifications.forEach((cert) => {
      let certLine = `    \\item \\textbf{${escapeLatex(cert.title)}}`;
      if (cert.issuer) certLine += ` | \\textit{${escapeLatex(cert.issuer)}}`;
      if (cert.date) certLine += ` \\hfill ${escapeLatex(cert.date)}`;
      tex += `${certLine}\n`;
      if (cert.link?.trim()) {
        tex += `    \\href{${escapeLatex(cert.link)}}{View Credential}\n`;
      }
    });
    tex += `\\end{itemize}\n`;
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

export function generateClassicAcademic(data: ResumeData): string {
  const {
    personalInfo,
    summary,
    experience = [],
    education = [],
    skills = [],
    projects = [],
  } = data || {};

  let tex = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{hyperref}
\\usepackage{parskip}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
    {\\Large \\textbf{${escapeLatex(personalInfo?.name || "YOUR NAME")}}} \\\\[4pt]
    ${personalInfo?.location ? `${escapeLatex(personalInfo.location)} $\\cdot$ ` : ""}
    ${personalInfo?.phone ? `${escapeLatex(personalInfo.phone)} $\\cdot$ ` : ""}
    ${personalInfo?.email ? `\\href{mailto:${escapeLatex(personalInfo.email)}}{${escapeLatex(personalInfo.email)}}` : ""}
\\end{center}

\\vspace{4pt}
\\hrule
\\vspace{8pt}
`;

  if (summary) {
    tex += `\\subsection*{Professional Summary}\n${escapeLatex(summary)}\n\n`;
  }

  if (education && education.length > 0) {
    tex += `\\subsection*{Education}\n`;
    education.forEach((edu) => {
      tex += `\\textbf{${escapeLatex(edu.institution)}} \\hfill ${escapeLatex(edu.startDate || "")} -- ${escapeLatex(edu.endDate)}\\\\\n`;
      tex += `\\textit{${escapeLatex(edu.degree)}} \\hfill ${escapeLatex(edu.location)}\\\\[6pt]\n`;
    });
  }

  if (experience && experience.length > 0) {
    tex += `\\subsection*{Experience}\n`;
    experience.forEach((exp) => {
      tex += `\\textbf{${escapeLatex(exp.company)}} \\hfill ${escapeLatex(exp.location)}\\\\\n`;
      tex += `\\textit{${escapeLatex(exp.title)}} \\hfill ${escapeLatex(exp.startDate || "")} -- ${escapeLatex(exp.endDate)}\n`;
      const resps = (exp.responsibilities || []).filter((r) => r.trim());
      if (resps.length > 0) {
        tex += `\\begin{itemize}\\setlength\\itemsep{0em}\n`;
        resps.forEach((r) => {
          tex += `    \\item ${escapeLatex(r)}\n`;
        });
        tex += `\\end{itemize}\n`;
      }
      tex += `\\vspace{4pt}\n`;
    });
  }

  if (skills && skills.length > 0) {
    tex += `\\subsection*{Skills}\n`;
    tex += `${escapeLatex(skills.filter((s) => s.trim()).join(", "))}\n\n`;
  }

  if (projects && projects.length > 0) {
    tex += `\\subsection*{Projects}\n`;
    projects.forEach((proj) => {
      tex += `\\textbf{${escapeLatex(proj.title)}}`;
      if (proj.technologies) tex += ` --- \\textit{${escapeLatex(proj.technologies)}}`;
      tex += `\\\\\n${escapeLatex(proj.description)}\\\\[4pt]\n`;
    });
  }

  tex += `\\end{document}\n`;
  return tex;
}

export const TEMPLATES: Record<string, ResumeTemplate> = {
  "clean-modern": {
    id: "clean-modern",
    name: "Clean Modern",
    description: "Sleek single-column tech resume with clean dividers and section highlights.",
    engine: "pdftex",
    generate: generateCleanModern,
  },
  "classic-academic": {
    id: "classic-academic",
    name: "Classic Academic",
    description:
      "Traditional serif format with generous margins, perfect for research and academic roles.",
    engine: "pdftex",
    generate: generateClassicAcademic,
  },
};

export function getTemplate(id?: string): ResumeTemplate {
  if (id && TEMPLATES[id]) {
    return TEMPLATES[id];
  }
  return TEMPLATES["clean-modern"];
}
