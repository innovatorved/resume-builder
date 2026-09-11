export interface CompileStatus {
  state: "idle" | "compiling" | "success" | "error";
  message?: string;
  durationMs?: number;
}

export interface CompileResult {
  success: boolean;
  pdfData: Uint8Array | null;
  log: string;
  error?: string;
  durationMs: number;
}

export class LatexCompilerBridge {
  public isCompiling = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private cache = new Map<string, { pdfData: Uint8Array; log: string }>();

  /**
   * Compiles LaTeX source code into a high-quality PDF Uint8Array.
   */
  async compile(texSource: string): Promise<CompileResult> {
    const startTime = performance.now();
    this.isCompiling = true;

    // Check memory cache
    const cached = this.cache.get(texSource);
    if (cached) {
      this.isCompiling = false;
      return {
        success: true,
        pdfData: cached.pdfData,
        log: cached.log,
        durationMs: 0,
      };
    }

    try {
      // Call dedicated high-performance compile endpoint
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawLatex: texSource }),
      });

      const durationMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const pdfData = new Uint8Array(buffer);
        const log = "LaTeX compiled successfully (pdflatex)";

        // Cache result (keep cache size limited to 20 documents)
        if (this.cache.size > 20) {
          const firstKey = this.cache.keys().next().value;
          if (firstKey) this.cache.delete(firstKey);
        }
        this.cache.set(texSource, { pdfData, log });

        return {
          success: true,
          pdfData,
          log,
          durationMs,
        };
      }

      const errText = await response.text();
      let errorSummary = "Compilation error";
      try {
        const json = JSON.parse(errText);
        errorSummary = json.details || json.error || errText;
      } catch {
        errorSummary = errText;
      }

      return {
        success: false,
        pdfData: null,
        log: errorSummary,
        error: errorSummary.slice(-300),
        durationMs,
      };
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - startTime);
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        pdfData: null,
        log: errMsg,
        error: errMsg,
        durationMs,
      };
    } finally {
      this.isCompiling = false;
    }
  }

  /**
   * Debounces compile calls so user typing is not interrupted.
   */
  debounceCompile(
    texSource: string,
    callback: (result: CompileResult) => void,
    delayMs: number = 600
  ) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      const result = await this.compile(texSource);
      callback(result);
    }, delayMs);
  }
}

export const latexCompiler = new LatexCompilerBridge();
