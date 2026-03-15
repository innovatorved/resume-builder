import { NextRequest, NextResponse } from "next/server";
import { generateLatex } from "@/lib/latex-generator";
import type { ResumeData } from "@/types/resume";

export async function POST(req: NextRequest) {
  try {
    const data: ResumeData = await req.json();

    if (!data) {
      return NextResponse.json({ error: "Resume data is required" }, { status: 400 });
    }

    // Generate the raw LaTeX string
    const texContent = generateLatex(data);

    // Call latex.ytotech.com POST API (no size limits on body)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const compileResponse = await fetch("https://latex.ytotech.com/builds/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
      console.error("[generate-pdf] Compiler API error:", errorText);
      return NextResponse.json(
        { error: "Failed to compile LaTeX to PDF", details: errorText },
        { status: 502 }
      );
    }

    // Get the generated PDF
    const pdfBuffer = await compileResponse.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${
          data.personalInfo?.name
            ? data.personalInfo.name.toLowerCase().replace(/\s+/g, "-") + "-resume.pdf"
            : "resume.pdf"
        }"`,
      },
    });
  } catch (error) {
    console.error("[generate-pdf] Internal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
