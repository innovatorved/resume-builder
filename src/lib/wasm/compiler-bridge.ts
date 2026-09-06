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
  private isCompiling = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private busyTexInstance: any = null;
  private initPromise: Promise<any> | null = null;

  private async getCompiler() {
    if (typeof window === "undefined") return null;

    if (this.busyTexInstance) return this.busyTexInstance;

    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          const { PdfLatex } = await import("texlyre-busytex");
          this.busyTexInstance = new PdfLatex({
            verbose: false,
          });
          return this.busyTexInstance;
        } catch (err) {
          console.warn("[LatexCompiler] Could not load texlyre-busytex in this environment:", err);
          return null;
        }
      })();
    }

    return this.initPromise;
  }

  /**
   * Compiles LaTeX source code into a PDF Uint8Array in the browser.
   */
  async compile(texSource: string): Promise<CompileResult> {
    const startTime = performance.now();
    this.isCompiling = true;

    try {
      const compiler = await this.getCompiler();

      if (compiler) {
        const res = await compiler.compile({
          input: texSource,
          verbose: "silent",
        });

        const durationMs = Math.round(performance.now() - startTime);

        if (res && res.success && res.pdf) {
          return {
            success: true,
            pdfData: res.pdf,
            log: res.log || "Compilation successful",
            durationMs,
          };
        }

        // If WASM returned exitCode != 0, return log
        if (res && !res.success) {
          return {
            success: false,
            pdfData: null,
            log: res.log || "Compilation failed",
            error: res.log ? res.log.slice(-300) : "LaTeX compilation error",
            durationMs,
          };
        }
      }

      // Fallback: If client WASM cannot run in this particular browser context,
      // call the serverless /api/generate-pdf endpoint
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawLatex: texSource }),
      });

      const durationMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        return {
          success: true,
          pdfData: new Uint8Array(buffer),
          log: "Compiled via fallback compiler",
          durationMs,
        };
      }

      const errText = await response.text();
      return {
        success: false,
        pdfData: null,
        log: errText,
        error: "Fallback compilation error",
        durationMs,
      };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        pdfData: null,
        log: err?.message || String(err),
        error: err?.message || "Internal compilation error",
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
    delayMs: number = 800
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
