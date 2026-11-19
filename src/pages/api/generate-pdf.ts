import type { APIRoute } from "astro";
import { sanitizeRawLatex } from "@/lib/latex/escape";
import { generateLatex } from "@/lib/latex-generator";
import type { ResumeData } from "@/types/resume";

const MAX_LATEX_BYTES = 500_000;
const COMPILER_TIMEOUT_MS = 25_000;

type CompileAttemptResult =
  | { ok: true; pdfBuffer: ArrayBuffer }
  | { ok: false; retryable: boolean; error: string };

function isPdfBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false;
  const header = new Uint8Array(buffer, 0, 5);
  // "%PDF-"
  return (
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d
  );
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), COMPILER_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function compileViaTexliveNet(texContent: string): Promise<CompileAttemptResult> {
  try {
    const form = new FormData();
    form.append("filecontents[]", texContent);
    form.append("filename[]", "document.tex");
    form.append("engine", "pdflatex");
    form.append("return", "pdf");

    const response = await fetchWithTimeout("https://texlive.net/cgi-bin/latexcgi", {
      method: "POST",
      body: form,
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      if (isPdfBuffer(buffer)) {
        return { ok: true, pdfBuffer: buffer };
      }
      // texlive.net returns 200 text/plain with the pdflatex log when LaTeX syntax fails
      const logText = new TextDecoder().decode(buffer).trim();
      const isSyntaxLog = logText.includes("!") || logText.includes("LaTeX Error");
      return {
        ok: false,
        retryable: !isSyntaxLog,
        error: logText.slice(-1500) || "texlive.net did not return a PDF",
      };
    }

    const errText = await response.text().catch(() => "");
    return {
      ok: false,
      retryable: response.status >= 500 || response.status === 429,
      error: errText || `texlive.net returned HTTP ${response.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      retryable: true,
      error: err instanceof Error ? err.message : "texlive.net request failed",
    };
  }
}

async function compileViaYtotech(texContent: string): Promise<CompileAttemptResult> {
  try {
    const response = await fetchWithTimeout("https://latex.ytotech.com/builds/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compiler: "pdflatex",
        resources: [{ main: true, content: texContent }],
      }),
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      if (isPdfBuffer(buffer)) {
        return { ok: true, pdfBuffer: buffer };
      }
    }

    const errText = await response.text().catch(() => "");
    return {
      ok: false,
      retryable: response.status >= 500 || response.status === 429,
      error: errText || `ytotech returned HTTP ${response.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      retryable: true,
      error: err instanceof Error ? err.message : "ytotech request failed",
    };
  }
}

async function compileViaLatexOnline(texContent: string): Promise<CompileAttemptResult> {
  // GET URL query strings have practical length limits; only use for compact documents
  if (texContent.length > 7_000) {
    return { ok: false, retryable: false, error: "Document too large for GET fallback" };
  }
  try {
    const response = await fetchWithTimeout(
      `https://latexonline.cc/compile?text=${encodeURIComponent(texContent)}`,
      { method: "GET" }
    );

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      if (isPdfBuffer(buffer)) {
        return { ok: true, pdfBuffer: buffer };
      }
    }

    const errText = await response.text().catch(() => "");
    return {
      ok: false,
      retryable: response.status >= 500 || response.status === 429,
      error: errText || `latexonline.cc returned HTTP ${response.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      retryable: true,
      error: err instanceof Error ? err.message : "latexonline.cc request failed",
    };
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as { rawLatex?: string } & Partial<ResumeData>;

    if (!body) {
      return new Response(JSON.stringify({ error: "Request payload is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let texContent = "";
    let resumeName = "resume";

    if (body.rawLatex && typeof body.rawLatex === "string") {
      if (body.rawLatex.length > MAX_LATEX_BYTES) {
        return new Response(JSON.stringify({ error: "LaTeX source exceeds 500 KB limit" }), {
          status: 413,
          headers: { "Content-Type": "application/json" },
        });
      }
      texContent = sanitizeRawLatex(body.rawLatex);
    } else {
      const data = body as ResumeData;
      texContent = generateLatex(data);
      if (data.personalInfo?.name) {
        resumeName =
          data.personalInfo.name.toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "resume";
      }
    }

    const backends = [compileViaTexliveNet, compileViaYtotech, compileViaLatexOnline];
    let lastError = "LaTeX compiler unavailable";

    for (const compile of backends) {
      const result = await compile(texContent);
      if (result.ok) {
        const filename = `${resumeName}-resume.pdf`;
        return new Response(result.pdfBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }
      lastError = result.error;
      if (!result.retryable) {
        break;
      }
    }

    return new Response(
      JSON.stringify({ error: "Failed to compile LaTeX to PDF", details: lastError }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[generate-pdf] Internal error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
