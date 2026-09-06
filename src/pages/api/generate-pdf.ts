import type { APIRoute } from "astro";
import { generateLatex } from "@/lib/latex-generator";
import type { ResumeData } from "@/types/resume";

export const POST: APIRoute = async ({ request }) => {
  try {
    const data: ResumeData = await request.json();

    if (!data) {
      return new Response(JSON.stringify({ error: "Resume data is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const texContent = generateLatex(data);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const compileResponse = await fetch("https://latex.ytotech.com/builds/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compiler: "pdflatex",
        resources: [
          {
            main: true,
            content: texContent,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!compileResponse.ok) {
      const errorText = await compileResponse.text();
      return new Response(
        JSON.stringify({ error: "Failed to compile LaTeX to PDF", details: errorText }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const pdfBuffer = await compileResponse.arrayBuffer();

    const filename = data.personalInfo?.name
      ? `${data.personalInfo.name.toLowerCase().replace(/\s+/g, "-")}-resume.pdf`
      : "resume.pdf";

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[generate-pdf] Internal error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
