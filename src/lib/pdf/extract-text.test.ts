import { describe, expect, test } from "bun:test";
import { extractedResumeToResumeData, extractResumeText } from "./extract-text";

describe("resume text extraction", () => {
  test("extracts markdown resume", async () => {
    const file = new File(
      ["# John Doe\n\nSenior Software Engineer\n- Built scalable systems"],
      "resume.md",
      {
        type: "text/markdown",
      }
    );
    const result = await extractResumeText(file);
    expect(result.fileType).toBe("markdown");
    expect(result.text).toContain("John Doe");
    expect(result.text).toContain("Senior Software Engineer");
  });

  test("extracts LaTeX resume", async () => {
    const latex = `\\documentclass{article}
\\begin{document}
\\section*{Alice Smith}
Experienced Systems Architect
\\end{document}`;
    const file = new File([latex], "resume.tex", { type: "application/x-latex" });
    const result = await extractResumeText(file);
    expect(result.fileType).toBe("latex");
    expect(result.text).toContain("Alice Smith");
  });

  test("extracts JSON resume", async () => {
    const jsonResume = JSON.stringify({
      basics: { name: "Bob Jones", label: "Product Designer", summary: "Design systems leader" },
      skills: [{ name: "Figma", keywords: ["UI", "UX"] }],
    });
    const file = new File([jsonResume], "resume.json", { type: "application/json" });
    const result = await extractResumeText(file);
    expect(result.fileType).toBe("json");
    expect(result.text).toContain("Bob Jones");
    expect(result.text).toContain("Figma");
  });

  test("extracts plain text resume", async () => {
    const file = new File(["Jane Doe\nFull Stack Developer"], "resume.txt", { type: "text/plain" });
    const result = await extractResumeText(file);
    expect(result.fileType).toBe("text");
    expect(result.text).toContain("Jane Doe");
  });

  test("converts extracted JSON resume to ResumeData", async () => {
    const jsonResume = JSON.stringify({
      basics: {
        name: "Carol Danvers",
        label: "Captain Marvel",
        email: "carol@avengers.org",
        phone: "+1-555-123-4567",
        summary: "Cosmic Defender",
      },
      skills: [{ name: "Flight", keywords: ["Energy Blast", "Super Strength"] }],
    });
    const file = new File([jsonResume], "carol.json", { type: "application/json" });
    const extracted = await extractResumeText(file);
    const resumeData = extractedResumeToResumeData(extracted);
    expect(resumeData.personalInfo.name).toBe("Carol Danvers");
    expect(resumeData.personalInfo.title).toBe("Captain Marvel");
    expect(resumeData.personalInfo.email).toBe("carol@avengers.org");
    expect(resumeData.skills).toContain("Flight");
    expect(resumeData.skills).toContain("Energy Blast");
  });

  test("converts extracted Markdown resume to ResumeData", async () => {
    const file = new File(
      ["# Bruce Wayne\nGotham City\nEmail: bruce@wayne.com\nPhone: (555) 000-1111"],
      "bruce.md",
      {
        type: "text/markdown",
      }
    );
    const extracted = await extractResumeText(file);
    const resumeData = extractedResumeToResumeData(extracted);
    expect(resumeData.personalInfo.name).toBe("Bruce Wayne");
    expect(resumeData.personalInfo.email).toBe("bruce@wayne.com");
    expect(resumeData.personalInfo.phone).toBe("(555) 000-1111");
  });
});
