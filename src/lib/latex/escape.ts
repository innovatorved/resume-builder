/**
 * Escapes special LaTeX characters from user-provided input strings
 * to prevent broken compilations and LaTeX injection attacks.
 */
export function escapeLatex(input: string | undefined | null): string {
  if (!input) return "";

  // Use unique placeholder tokens without LaTeX special characters to prevent double-escaping
  const BACKSLASH_PLACEHOLDER = "\x00BS\x00";

  return String(input)
    .replace(/\\/g, BACKSLASH_PLACEHOLDER)
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/\x00BS\x00/g, "\\textbackslash{}");
}

/**
 * Strips dangerous LaTeX commands from raw user LaTeX inputs
 * if shell escape or arbitrary system access was ever attempted.
 */
export function sanitizeRawLatex(latex: string): string {
  if (!latex) return "";

  // Prohibit dangerous primitives
  const dangerousPatterns = [
    /\\write18\b/gi,
    /\\immediate\\write18\b/gi,
    /\\input\s*\{(?:\/|(?:\.\.\/)+)[^}]+\}/gi, // Prevent local file system traversal
  ];

  let sanitized = latex;
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, "% [BLOCKED DANGEROUS COMMAND]");
  }

  return sanitized;
}
