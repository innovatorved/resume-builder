import { describe, expect, it } from "bun:test";
import { validateLatexSyntax } from "./validator";

describe("validateLatexSyntax", () => {
  it("returns no errors for balanced latex", () => {
    const valid = `\\documentclass{article}
\\begin{document}
\\section{Experience}
Worked with {React} and TypeScript.
\\end{document}`;
    const errors = validateLatexSyntax(valid);
    expect(errors.length).toBe(0);
  });

  it("detects unclosed curly braces", () => {
    const invalid = `\\documentclass{article}
\\begin{document}
\\textbf{Unclosed brace
\\end{document}`;
    const errors = validateLatexSyntax(invalid);
    expect(errors.some((e) => e.message.includes("Unclosed opening brace"))).toBe(true);
  });

  it("detects unmatched closing braces", () => {
    const invalid = `\\documentclass{article}
\\begin{document}
Extra brace} here.
\\end{document}`;
    const errors = validateLatexSyntax(invalid);
    expect(errors.some((e) => e.message.includes("Unmatched closing brace"))).toBe(true);
  });

  it("detects unclosed environment", () => {
    const invalid = `\\documentclass{article}
\\begin{document}
\\begin{itemize}
\\item Test
\\end{document}`;
    const errors = validateLatexSyntax(invalid);
    expect(
      errors.some(
        (e) =>
          e.message.includes("Mismatched LaTeX environment") ||
          e.message.includes("Unclosed LaTeX environment")
      )
    ).toBe(true);
  });

  it("detects mismatched end environment", () => {
    const invalid = `\\documentclass{article}
\\begin{document}
\\end{tabular}
\\end{document}`;
    const errors = validateLatexSyntax(invalid);
    expect(errors.some((e) => e.message.includes("Mismatched LaTeX environment"))).toBe(true);
  });

  it("detects unmatched end environment when stack is empty", () => {
    const invalid = `\\documentclass{article}
\\end{tabular}`;
    const errors = validateLatexSyntax(invalid);
    expect(errors.some((e) => e.message.includes("Unmatched \\end{tabular}"))).toBe(true);
  });

  it("validates that generateCleanModern output passes syntax validation", () => {
    const { generateCleanModern } = require("../templates");
    const resumeData = {
      personalInfo: {
        name: "VED PRAKASH GUPTA",
        title: "Cloud Engineer",
        phone: "+91 7007868719",
        email: "vedgupta0401@gmail.com",
        linkedin: "https://linkedin.com/in/innovatorved",
        github: "https://github.com/innovatorved",
        website: "https://innovatorved.com",
        location: "Lucknow, India",
      },
      summary: "Experienced Cloud Engineer specializing in distributed architectures and DevOps.",
      skills: [
        "Cloud & Infrastructure: Google Cloud Platform (GCP), Terraform, Cloudflare Workers",
        "DevOps: Docker, Kubernetes, CI/CD pipelines",
      ],
      experience: [
        {
          company: "Tech Corp",
          title: "Cloud Architect",
          location: "Bengaluru, India",
          startDate: "Jan 2024",
          endDate: "Present",
          responsibilities: [
            "Architected cloud infrastructure reducing latency by **30%** for **100k+ MAU**.",
          ],
        },
      ],
      projects: [
        {
          title: "Audiobook AI",
          technologies: "Cloudflare, TypeScript, Gemini API",
          date: "2024",
          description: "Engineered real-time speech synthesis pipeline with **500+ stars on GitHub**.",
        },
      ],
      education: [
        {
          institution: "AKTU University",
          degree: "B.Tech in Computer Science",
          location: "India",
          startDate: "2020",
          endDate: "2024",
        },
      ],
      certifications: [
        {
          title: "Google Cloud Certified Professional Cloud Architect",
          issuer: "Google",
          date: "2024",
        },
      ],
      languages: [
        {
          name: "English",
          level: "Fluent",
        },
      ],
    };

    const latex = generateCleanModern(resumeData);
    expect(latex).toContain("\\documentclass[10pt,a4paper]{article}");
    expect(latex).toContain("\\usepackage[default]{lato}");
    expect(latex).toContain("\\definecolor{primary}{HTML}{2b2b2b}");
    expect(latex).toContain("\\definecolor{accent}{HTML}{003366}");
    expect(latex).toContain("\\textbf{VED PRAKASH GUPTA}");
    expect(latex).toContain("\\section{Technical Skills}");
    expect(latex).toContain("\\section{Professional Experience}");
    expect(latex).toContain("\\textbf{30\\%}");
    expect(latex).toContain("\\textbf{100k+ MAU}");

    const errors = validateLatexSyntax(latex);
    expect(errors).toEqual([]);
  });
});

