import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type SyntaxMarker, validateLatexSyntax } from "@/lib/latex/validator";

interface MonacoLatexEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function MonacoLatexEditor({ value, onChange, readOnly = false }: MonacoLatexEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [syntaxIssues, setSyntaxIssues] = useState<SyntaxMarker[]>([]);

  const updateSyntaxMarkers = useCallback((code: string) => {
    const issues = validateLatexSyntax(code);
    setSyntaxIssues(issues);

    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const markers = issues.map((issue) => ({
      startLineNumber: issue.startLineNumber,
      startColumn: issue.startColumn,
      endLineNumber: issue.endLineNumber,
      endColumn: issue.endColumn,
      message: issue.message,
      severity:
        issue.severity === "error"
          ? (monacoRef.current?.MarkerSeverity.Error ?? 8)
          : (monacoRef.current?.MarkerSeverity.Warning ?? 4),
    }));

    monacoRef.current.editor.setModelMarkers(model, "latex-syntax", markers);
  }, []);

  useEffect(() => {
    updateSyntaxMarkers(value);
  }, [value, updateSyntaxMarkers]);

  const handleEditorDidMount: OnMount = (editor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register LaTeX language if not already registered
    const existingLangs = monaco.languages.getLanguages();
    if (!existingLangs.some((l: any) => l.id === "latex")) {
      monaco.languages.register({ id: "latex" });
    }

    // Language configuration for brackets, comments, and auto-closing
    monaco.languages.setLanguageConfiguration("latex", {
      comments: {
        lineComment: "%",
      },
      brackets: [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
      ],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: "$", close: "$" },
        { open: '"', close: '"' },
      ],
      surroundingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: "$", close: "$" },
      ],
    });

    // Monarch syntax tokenizer for rich LaTeX syntax highlighting
    monaco.languages.setMonarchTokensProvider("latex", {
      defaultToken: "",
      tokenPostfix: ".latex",

      keywords: [
        "documentclass",
        "usepackage",
        "begin",
        "end",
        "item",
        "section",
        "subsection",
        "subsubsection",
        "paragraph",
        "textbf",
        "textit",
        "textsc",
        "textsf",
        "texttt",
        "underline",
        "emph",
        "href",
        "url",
        "vspace",
        "hspace",
        "hfill",
        "vfill",
        "definecolor",
        "color",
        "titleformat",
        "titlespacing",
        "pagestyle",
        "urlstyle",
        "setlength",
        "parindent",
        "Huge",
        "huge",
        "LARGE",
        "Large",
        "large",
        "normalsize",
        "small",
        "footnotesize",
        "scriptsize",
        "tiny",
        "titlerule",
        "centering",
        "raggedright",
        "bfseries",
        "scshape",
      ],

      tokenizer: {
        root: [
          // Comments
          [/%.*$/, "comment"],

          // Math mode inline & display
          [/\$\$[^$]*\$\$/, "string.math"],
          [/\$[^$]*\$/, "string.math"],

          // Environment declarations
          [
            /(\\begin)(\s*\{)([^}]+)(\})/,
            ["keyword", "delimiter.curly", "type.identifier", "delimiter.curly"],
          ],
          [
            /(\\end)(\s*\{)([^}]+)(\})/,
            ["keyword", "delimiter.curly", "type.identifier", "delimiter.curly"],
          ],

          // Commands with backslash
          [
            /\\([a-zA-Z@]+)/,
            {
              cases: {
                "@keywords": "keyword",
                "@default": "tag",
              },
            },
          ],

          // Escaped characters: \%, \&, \$, \_, \#, etc.
          [/\\[%&$_#{}]/, "constant.character.escape"],

          // Line break
          [/\\\\/, "keyword.operator"],

          // Brackets and braces
          [/[{}()[\]]/, "@brackets"],

          // Whitespace
          [/\s+/, "white"],
        ],
      },
    });

    // Custom dark theme for LaTeX matching VS Code & sso.vedgupta.in
    monaco.editor.defineTheme("latex-theme", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "C586C0", fontStyle: "bold" },
        { token: "tag", foreground: "4EC9B0" },
        { token: "type.identifier", foreground: "4FC1FF", fontStyle: "bold" },
        { token: "string.math", foreground: "CE9178" },
        { token: "constant.character.escape", foreground: "D7BA7D" },
        { token: "keyword.operator", foreground: "D4D4D4", fontStyle: "bold" },
        { token: "delimiter.curly", foreground: "FFD700" },
      ],
      colors: {
        "editor.background": "#0a0a0a",
        "editor.foreground": "#e5e5e5",
        "editorLineNumber.foreground": "#525252",
        "editorLineNumber.activeForeground": "#ffffff",
        "editorCursor.foreground": "#ffffff",
        "editor.lineHighlightBackground": "#171717",
        "editor.selectionBackground": "#262626",
      },
    });

    monaco.editor.setTheme("latex-theme");

    // Register custom LaTeX snippet completions
    monaco.languages.registerCompletionItemProvider("latex", {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = [
          {
            label: "\\section",
            kind: monaco.languages.CompletionItemKind.Function,
            // biome-ignore lint/suspicious/noTemplateCurlyInString: Monaco snippet syntax
            insertText: "\\section{${1:Section Title}}\n$0",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Add a new section heading",
            range,
          },
          {
            label: "\\subsection",
            kind: monaco.languages.CompletionItemKind.Function,
            // biome-ignore lint/suspicious/noTemplateCurlyInString: Monaco snippet syntax
            insertText: "\\subsection{${1:Subsection Title}}\n$0",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Add a subsection heading",
            range,
          },
          {
            label: "\\textbf",
            kind: monaco.languages.CompletionItemKind.Snippet,
            // biome-ignore lint/suspicious/noTemplateCurlyInString: Monaco snippet syntax
            insertText: "\\textbf{${1:bold text}} $0",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Format text as bold",
            range,
          },
          {
            label: "\\textit",
            kind: monaco.languages.CompletionItemKind.Snippet,
            // biome-ignore lint/suspicious/noTemplateCurlyInString: Monaco snippet syntax
            insertText: "\\textit{${1:italic text}} $0",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Format text as italic",
            range,
          },
          {
            label: "\\href",
            kind: monaco.languages.CompletionItemKind.Snippet,
            // biome-ignore lint/suspicious/noTemplateCurlyInString: Monaco snippet syntax
            insertText: "\\href{${1:url}}{${2:link text}} $0",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Add an external hyperlink",
            range,
          },
          {
            label: "\\begin{itemize}",
            kind: monaco.languages.CompletionItemKind.Snippet,
            // biome-ignore lint/suspicious/noTemplateCurlyInString: Monaco snippet syntax
            insertText: "\\begin{itemize}\n    \\item ${1:Bullet point}\n\\end{itemize}\n$0",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Bullet point list",
            range,
          },
          {
            label: "\\item",
            kind: monaco.languages.CompletionItemKind.Snippet,
            // biome-ignore lint/suspicious/noTemplateCurlyInString: Monaco snippet syntax
            insertText: "\\item ${1:Description} $0",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "List item",
            range,
          },
          {
            label: "\\hfill",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "\\hfill ",
            range,
          },
        ];

        return { suggestions };
      },
    });

    updateSyntaxMarkers(value);
  };

  const jumpToFirstError = () => {
    const first = syntaxIssues[0];
    if (first && editorRef.current) {
      editorRef.current.revealLineInCenter(first.startLineNumber);
      editorRef.current.setPosition({
        lineNumber: first.startLineNumber,
        column: first.startColumn,
      });
      editorRef.current.focus();
    }
  };

  return (
    <div className="w-full h-full relative flex flex-col bg-neutral-950">
      {/* File Tab Header & Real-time Type Check / Syntax Status */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-950 border-b border-neutral-800 text-xs select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-neutral-200 bg-neutral-900 px-2.5 py-1 rounded border border-neutral-800 font-mono text-[11px]">
            <span>main.tex</span>
          </div>
        </div>

        {/* Real-time Syntax & Type Check Status Indicator */}
        <div className="flex items-center gap-2">
          {syntaxIssues.length === 0 ? (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-0.5 rounded-full font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>LaTeX Valid</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={jumpToFirstError}
              className="flex items-center gap-1.5 text-[11px] text-red-400 bg-red-950/40 border border-red-800/60 px-2.5 py-0.5 rounded-full font-mono hover:bg-red-950/70 transition-colors cursor-pointer"
              title={syntaxIssues.map((s) => `Line ${s.startLineNumber}: ${s.message}`).join("\n")}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span>
                {syntaxIssues.length} Syntax Error{syntaxIssues.length > 1 ? "s" : ""} (Click to
                jump)
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="latex"
          language="latex"
          theme="latex-theme"
          value={value}
          onChange={(val) => {
            const newVal = val || "";
            onChange(newVal);
            updateSyntaxMarkers(newVal);
          }}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            lineHeight: 20,
            fontFamily: "'GeistMono', ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
            wordWrap: "on",
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            automaticLayout: true,
            padding: { top: 10, bottom: 10 },
            lineNumbers: "on",
            renderLineHighlight: "all",
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}
