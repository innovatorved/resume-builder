import { describe, expect, it } from "bun:test";
import { escapeLatex, sanitizeRawLatex } from "./escape";

describe("escapeLatex", () => {
  it("should return empty string for null or undefined", () => {
    expect(escapeLatex(null)).toBe("");
    expect(escapeLatex(undefined)).toBe("");
    expect(escapeLatex("")).toBe("");
  });

  it("should escape LaTeX special characters", () => {
    const input = "Sales & Marketing (50% growth) for $100K #1 item_name {important} ~10^2";
    const escaped = escapeLatex(input);

    expect(escaped).toContain("\\&");
    expect(escaped).toContain("\\%");
    expect(escaped).toContain("\\$");
    expect(escaped).toContain("\\#");
    expect(escaped).toContain("\\_");
    expect(escaped).toContain("\\{");
    expect(escaped).toContain("\\}");
    expect(escaped).toContain("\\textasciitilde{}");
    expect(escaped).toContain("\\textasciicircum{}");
  });

  it("should escape backslashes without double escaping", () => {
    const input = "C:\\path\\to\\file";
    const escaped = escapeLatex(input);

    expect(escaped).toContain("\\textbackslash{}");
    expect(escaped).not.toContain("@@LATEX_BACKSLASH@@");
  });
});

describe("sanitizeRawLatex", () => {
  it("should block shell-escape / write18 commands", () => {
    const malicious = "\\documentclass{article}\n\\immediate\\write18{rm -rf /}\n\\begin{document}Hello\\end{document}";
    const sanitized = sanitizeRawLatex(malicious);

    expect(sanitized).not.toContain("\\write18");
    expect(sanitized).toContain("[BLOCKED DANGEROUS COMMAND]");
  });

  it("should block absolute path traversal in \\input", () => {
    const malicious = "\\input{/etc/passwd}";
    const sanitized = sanitizeRawLatex(malicious);

    expect(sanitized).not.toContain("/etc/passwd");
    expect(sanitized).toContain("[BLOCKED DANGEROUS COMMAND]");
  });

  it("should allow harmless LaTeX macros", () => {
    const safe = "\\section{Experience}\n\\textbf{Senior Engineer}\n\\begin{itemize}\n\\item Built APIs\n\\end{itemize}";
    const sanitized = sanitizeRawLatex(safe);

    expect(sanitized).toBe(safe);
  });
});
