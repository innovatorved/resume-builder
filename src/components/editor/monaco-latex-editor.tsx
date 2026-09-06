import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef } from "react";
import { validateLatexSyntax } from "@/lib/latex/validator";

interface MonacoLatexEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function MonacoLatexEditor({ value, onChange, readOnly = false }: MonacoLatexEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const updateSyntaxMarkers = useCallback((code: string) => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const issues = validateLatexSyntax(code);
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

    // Register custom LaTeX completions
    monaco.languages.registerCompletionItemProvider("latex", {
      provideCompletionItems: (model, position) => {
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

  return (
    <div className="w-full h-full relative flex flex-col bg-neutral-950">
      {/* File Tab Header */}
      <div className="flex items-center px-3 py-1 bg-neutral-950 border-b border-neutral-800 text-xs select-none">
        <div className="flex items-center gap-2 text-neutral-200 bg-neutral-900 px-3 py-1 rounded-t border-t-2 border-white font-mono text-[11px]">
          <span>main.tex</span>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="latex"
          language="latex"
          theme="vs-dark"
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
