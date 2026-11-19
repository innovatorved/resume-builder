import type { ReactNode } from "react";

function safeHref(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function inlineMarkdown(value: string, keyPrefix = "md"): ReactNode[] {
  const parts = value.split(/(\[[^\]]+\]\(https:\/\/[^)\s]+\)|`[^`\n]+`|\*\*[^*\n]+\*\*)/g);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      return href ? (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 decoration-neutral-500 hover:text-foreground"
        >
          {link[1]}
        </a>
      ) : (
        part
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={key}
          className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.9em] dark:bg-neutral-900"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

/**
 * Renders safe, lightweight markdown for Knowledge Hub documents and chat replies.
 */
export function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push(
        <p
          key={`p-${blocks.length}`}
          className="leading-6 text-neutral-700 dark:text-neutral-300 my-1.5"
        >
          {inlineMarkdown(paragraph.join(" "))}
        </p>
      );
      paragraph = [];
    }
    if (list.length) {
      blocks.push(
        <ul
          key={`ul-${blocks.length}`}
          className="list-disc space-y-1.5 pl-5 text-neutral-700 dark:text-neutral-300 my-2"
        >
          {list.map((item) => (
            <li key={item}>{inlineMarkdown(item, `${blocks.length}-${item}`)}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        blocks.push(
          <pre
            key={`pre-${blocks.length}`}
            className="overflow-x-auto rounded-lg bg-neutral-100 dark:bg-neutral-900 p-3 font-mono text-xs text-neutral-800 dark:text-neutral-200 my-2.5"
          >
            {codeLines.join("\n")}
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        flush();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const item = line.match(/^[-*]\s+(.+)$/);
    const blockquote = line.match(/^>\s*(.+)$/);

    if (heading) {
      flush();
      const level = heading[1].length;
      blocks.push(
        level === 1 ? (
          <h1
            key={`h-${blocks.length}`}
            className="text-xl font-bold tracking-tight text-foreground mt-4 mb-2 pb-1 border-b border-border/60"
          >
            {inlineMarkdown(heading[2])}
          </h1>
        ) : level === 2 ? (
          <h2
            key={`h-${blocks.length}`}
            className="text-base font-semibold text-foreground mt-3 mb-1.5"
          >
            {inlineMarkdown(heading[2])}
          </h2>
        ) : (
          <h3
            key={`h-${blocks.length}`}
            className="text-sm font-semibold text-foreground mt-2 mb-1"
          >
            {inlineMarkdown(heading[2])}
          </h3>
        )
      );
    } else if (blockquote) {
      flush();
      blocks.push(
        <blockquote
          key={`bq-${blocks.length}`}
          className="border-l-2 border-indigo-500 pl-3 italic text-neutral-600 dark:text-neutral-400 my-2 text-xs leading-relaxed"
        >
          {inlineMarkdown(blockquote[1])}
        </blockquote>
      );
    } else if (item) {
      if (paragraph.length) flush();
      list.push(item[1]);
    } else if (!line.trim()) {
      flush();
    } else if (/^---+$/.test(line.trim())) {
      flush();
      blocks.push(<hr key={`hr-${blocks.length}`} className="border-border my-3" />);
    } else {
      if (list.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  if (inCodeBlock && codeLines.length) {
    blocks.push(
      <pre
        key={`pre-${blocks.length}`}
        className="overflow-x-auto rounded-lg bg-neutral-100 dark:bg-neutral-900 p-3 font-mono text-xs my-2.5"
      >
        {codeLines.join("\n")}
      </pre>
    );
  }
  return <div className="space-y-1.5 break-words text-xs sm:text-sm leading-relaxed">{blocks}</div>;
}
