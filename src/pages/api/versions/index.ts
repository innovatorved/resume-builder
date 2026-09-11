import type { APIRoute } from "astro";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resume, resumeVersion } from "@/lib/db/schema";
import type { ResumeData } from "@/types/resume";

export const GET: APIRoute = async ({ request }) => {
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

    const url = new URL(request.url);
    const resumeId = url.searchParams.get("resumeId");

    if (!resumeId) {
      return new Response(JSON.stringify({ success: false, error: "resumeId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify user owns the resume
    const [owned] = await db
      .select({ id: resume.id })
      .from(resume)
      .where(and(eq(resume.id, resumeId), eq(resume.userId, session.user.id)))
      .limit(1);

    if (!owned) {
      return new Response(JSON.stringify({ success: false, error: "Resume not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const versions = await db
      .select()
      .from(resumeVersion)
      .where(eq(resumeVersion.resumeId, resumeId))
      .orderBy(desc(resumeVersion.versionNumber));

    return new Response(
      JSON.stringify({
        success: true,
        data: versions,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch versions",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
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

    const body = (await request.json()) as {
      resumeId?: string;
      sourceKey?: string;
      pdfKey?: string;
      structuredData?: ResumeData;
      rawLatex?: string;
      isLatexCustom?: boolean;
      changeSummary?: string;
    };
    const { resumeId, sourceKey, pdfKey, structuredData, rawLatex, isLatexCustom, changeSummary } =
      body;

    if (!resumeId || !sourceKey || !structuredData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "resumeId, sourceKey, and structuredData are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify ownership
    const [ownedResume] = await db
      .select()
      .from(resume)
      .where(and(eq(resume.id, resumeId), eq(resume.userId, session.user.id)))
      .limit(1);

    if (!ownedResume) {
      return new Response(JSON.stringify({ success: false, error: "Resume not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Determine the next version number
    const [latestVersion] = await db
      .select({ versionNumber: resumeVersion.versionNumber })
      .from(resumeVersion)
      .where(eq(resumeVersion.resumeId, resumeId))
      .orderBy(desc(resumeVersion.versionNumber))
      .limit(1);

    const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;
    const versionId = crypto.randomUUID();
    const now = new Date();

    await db.insert(resumeVersion).values({
      id: versionId,
      resumeId,
      versionNumber: nextVersionNumber,
      sourceKey,
      pdfKey: pdfKey || null,
      structuredData: structuredData as ResumeData,
      rawLatex: rawLatex || null,
      isLatexCustom: Boolean(isLatexCustom),
      changeSummary: changeSummary || `Version ${nextVersionNumber}`,
      createdAt: now,
    });

    // Update resume with currentVersionId and updatedAt
    await db
      .update(resume)
      .set({
        currentVersionId: versionId,
        updatedAt: now,
        data: structuredData as ResumeData,
      })
      .where(eq(resume.id, resumeId));

    const knowledgeService = locals.runtime?.env.KNOWLEDGE_AGENT;
    if (knowledgeService) {
      const target = new URL(
        `/users/${encodeURIComponent(session.user.id)}/resumes/sync`,
        "https://knowledge-agent.internal"
      );
      try {
        const syncResponse = await knowledgeService.fetch(
          new Request(target, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resumeId,
              versionId,
              name: ownedResume.name,
              data: structuredData,
              rawLatex: rawLatex || "",
            }),
          })
        );
        if (!syncResponse.ok) {
          console.warn("[create-version] Knowledge sync warning:", syncResponse.status);
        }
      } catch (error) {
        console.warn(
          "[create-version] Knowledge sync unavailable:",
          error instanceof Error ? error.message : "unknown error"
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: versionId,
          versionNumber: nextVersionNumber,
          changeSummary: changeSummary || `Version ${nextVersionNumber}`,
          createdAt: now,
        },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[create-version] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create version",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
