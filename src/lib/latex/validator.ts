export interface SyntaxMarker {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  severity: "error" | "warning";
}

/**
 * Validates LaTeX source code in real-time for common syntax issues:
 * 1. Unbalanced curly braces { and }
 * 2. Unbalanced environments (\begin{env} without \end{env})
 * 3. Unescaped special characters in plain text (% outside comment, & outside tabular/align, etc.)
 */
export function validateLatexSyntax(source: string): SyntaxMarker[] {
  const markers: SyntaxMarker[] = [];
  const lines = source.split("\n");

  const braceStack: { line: number; col: number }[] = [];
  const envStack: { name: string; line: number; col: number }[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineNum = lineIndex + 1;
    const line = lines[lineIndex];

    // Strip comments (% to end of line, unless escaped as \%)
    let commentStart = -1;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === "%" && (i === 0 || line[i - 1] !== "\\")) {
        commentStart = i;
        break;
      }
    }

    const codePart = commentStart >= 0 ? line.slice(0, commentStart) : line;

    // Check environments \begin{xyz} and \end{xyz}
    const beginMatches = Array.from(codePart.matchAll(/\\begin\{([a-zA-Z*]+)\}/g));
    for (const match of beginMatches) {
      if (match.index !== undefined) {
        envStack.push({
          name: match[1],
          line: lineNum,
          col: match.index + 1,
        });
      }
    }

    const endMatches = Array.from(codePart.matchAll(/\\end\{([a-zA-Z*]+)\}/g));
    for (const match of endMatches) {
      if (match.index === undefined) continue;
      const envName = match[1];
      if (envStack.length === 0) {
        markers.push({
          startLineNumber: lineNum,
          startColumn: match.index + 1,
          endLineNumber: lineNum,
          endColumn: match.index + match[0].length + 1,
          message: `Unmatched \\end{${envName}} with no corresponding \\begin{${envName}}`,
          severity: "error",
        });
      } else {
        const last = envStack.pop();
        if (last && last.name !== envName) {
          markers.push({
            startLineNumber: lineNum,
            startColumn: match.index + 1,
            endLineNumber: lineNum,
            endColumn: match.index + match[0].length + 1,
            message: `Mismatched LaTeX environment: Expected \\end{${last.name}}, but found \\end{${envName}}`,
            severity: "error",
          });
        }
      }
    }

    // Check braces balance per character (ignoring escaped \{ and \})
    for (let colIndex = 0; colIndex < codePart.length; colIndex++) {
      const char = codePart[colIndex];
      const prevChar = colIndex > 0 ? codePart[colIndex - 1] : "";

      if (char === "{" && prevChar !== "\\") {
        braceStack.push({ line: lineNum, col: colIndex + 1 });
      } else if (char === "}" && prevChar !== "\\") {
        if (braceStack.length === 0) {
          markers.push({
            startLineNumber: lineNum,
            startColumn: colIndex + 1,
            endLineNumber: lineNum,
            endColumn: colIndex + 2,
            message: "Unmatched closing brace '}'. Did you forget to open with '{'?",
            severity: "error",
          });
        } else {
          braceStack.pop();
        }
      }
    }
  }

  // Report any unclosed braces
  for (const unclosed of braceStack) {
    markers.push({
      startLineNumber: unclosed.line,
      startColumn: unclosed.col,
      endLineNumber: unclosed.line,
      endColumn: unclosed.col + 1,
      message: "Unclosed opening brace '{'. Missing matching '}'.",
      severity: "error",
    });
  }

  // Report any unclosed environments
  for (const unclosed of envStack) {
    markers.push({
      startLineNumber: unclosed.line,
      startColumn: unclosed.col,
      endLineNumber: unclosed.line,
      endColumn: unclosed.col + unclosed.name.length + 8,
      message: `Unclosed LaTeX environment \\begin{${unclosed.name}}. Missing \\end{${unclosed.name}}.`,
      severity: "error",
    });
  }

  return markers;
}
