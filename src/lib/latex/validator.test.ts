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
    expect(errors.some((e) => e.message.includes("Mismatched LaTeX environment") || e.message.includes("Unclosed LaTeX environment"))).toBe(true);
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
});
