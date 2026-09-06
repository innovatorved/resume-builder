import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resume, resumeVersion } from "@/lib/db/schema";

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: "Version ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const [found] = await db
      .select({
        id: resumeVersion.id,
        resumeId: resumeVersion.resumeId,
        versionNumber: resumeVersion.versionNumber,
        sourceKey: resumeVersion.sourceKey,
        pdfKey: resumeVersion.pdfKey,
        structuredData: resumeVersion.structuredData,
        rawLatex: resumeVersion.rawLatex,
        isLatexCustom: resumeVersion.isLatexCustom,
        changeSummary: resumeVersion.changeSummary,
        createdAt: resumeVersion.createdAt,
      })
      .from(resumeVersion)
      .innerJoin(resume, eq(resumeVersion.resumeId, resume.id))
      .where(and(eq(resumeVersion.id, id), eq(resume.userId, session.user.id)))
      .limit(1);

    if (!found) {
      return new Response(JSON.stringify({ success: false, error: "Version not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: found,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch version",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
