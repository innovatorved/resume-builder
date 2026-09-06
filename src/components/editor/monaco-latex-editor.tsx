import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { useRef } from "react";

interface MonacoLatexEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function MonacoLatexEditor({ value, onChange, readOnly = false }: MonacoLatexEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco: Monaco) => {
    editorRef.current = editor;

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
  };

  return (
    <div className="w-full h-full relative flex flex-col bg-[#1e1e1e]">
      <Editor
        height="100%"
        defaultLanguage="latex"
        language="latex"
        theme="vs-dark"
        value={value}
        onChange={(val) => onChange(val || "")}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineHeight: 20,
          fontFamily: "'Geist Mono', 'Fira Code', Menlo, Monaco, monospace",
          wordWrap: "on",
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          lineNumbers: "on",
          renderLineHighlight: "all",
          tabSize: 2,
        }}
      />
    </div>
  );
}
