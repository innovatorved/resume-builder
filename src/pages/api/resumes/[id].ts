import type { APIRoute } from "astro";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getCloudflareEnv } from "@/lib/cloudflare-env";
import { db } from "@/lib/db";
import { resume, resumeVersion } from "@/lib/db/schema";
import { generateCleanModern } from "@/lib/templates";
import { type ResumeData, updateResumeSchema } from "@/lib/validations/resume";

function parseResumeData(data: unknown): ResumeData {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as ResumeData;
    } catch {
      return data as unknown as ResumeData;
    }
  }
  return data as ResumeData;
}

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
      return new Response(JSON.stringify({ success: false, error: "ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const [found] = await db
      .select({
        id: resume.id,
        name: resume.name,
        data: resume.data,
        isPinned: resume.isPinned,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      })
      .from(resume)
      .where(and(eq(resume.id, id), eq(resume.userId, session.user.id)))
      .limit(1);

    if (!found) {
      return new Response(JSON.stringify({ success: false, error: "Resume not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...found,
          data: parseResumeData(found.data),
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch resume",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
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
    const body = (await request.json()) as Record<string, unknown>;
    const validated = updateResumeSchema.parse({ ...body, id });

    const [existing] = await db
      .select()
      .from(resume)
      .where(and(eq(resume.id, validated.id), eq(resume.userId, session.user.id)))
      .limit(1);

    if (!existing) {
      return new Response(JSON.stringify({ success: false, error: "Resume not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const updateValues: Partial<typeof resume.$inferInsert> = {
      updatedAt: now,
    };
    if (validated.name !== undefined) updateValues.name = validated.name;
    if (validated.data !== undefined) updateValues.data = validated.data;
    if (validated.isPinned !== undefined) updateValues.isPinned = validated.isPinned;

    await db.update(resume).set(updateValues).where(eq(resume.id, validated.id));

    // Also persist rawLatex to the current version if supplied
    if (typeof body.rawLatex === "string") {
      if (existing.currentVersionId) {
        await db
          .update(resumeVersion)
          .set({
            rawLatex: body.rawLatex,
            structuredData: (updateValues.data || parseResumeData(existing.data)) as ResumeData,
          })
          .where(eq(resumeVersion.id, existing.currentVersionId));
      } else {
        const vId = crypto.randomUUID();
        await db.insert(resumeVersion).values({
          id: vId,
          resumeId: existing.id,
          versionNumber: 1,
          sourceKey: `resumes/${session.user.id}/${existing.id}/source/${vId}.tex`,
          pdfKey: null,
          structuredData: (updateValues.data || parseResumeData(existing.data)) as ResumeData,
          rawLatex: body.rawLatex,
          isLatexCustom: true,
          changeSummary: "Saved edits",
          createdAt: now,
        });
        await db.update(resume).set({ currentVersionId: vId }).where(eq(resume.id, existing.id));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: validated.id,
          name: validated.name ?? existing.name,
          data: validated.data ?? parseResumeData(existing.data),
          createdAt: existing.createdAt,
          updatedAt: now,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update resume",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
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
      return new Response(JSON.stringify({ success: false, error: "ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const [existing] = await db
      .select()
      .from(resume)
      .where(and(eq(resume.id, id), eq(resume.userId, session.user.id)))
      .limit(1);

    if (!existing) {
      return new Response(JSON.stringify({ success: false, error: "Resume not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await db.delete(resume).where(eq(resume.id, id));
    const env = await getCloudflareEnv(locals);
    const knowledgeService = env.KNOWLEDGE_AGENT;
    if (knowledgeService) {
      try {
        const target = new URL(
          `/users/${encodeURIComponent(session.user.id)}/resumes/${encodeURIComponent(id)}`,
          "https://knowledge-agent.internal"
        );
        const internalSecret =
          env.INTERNAL_SERVICE_KEY ||
          process.env.INTERNAL_SERVICE_KEY ||
          "rb_internal_agent_sec_2026";
        const response = await knowledgeService.fetch(
          new Request(target, {
            method: "DELETE",
            headers: { "x-internal-secret": internalSecret },
          })
        );
        if (!response.ok)
          console.warn("[delete-resume] Knowledge cleanup warning:", response.status);
      } catch (error) {
        console.warn(
          "[delete-resume] Knowledge cleanup unavailable:",
          error instanceof Error ? error.message : "unknown error"
        );
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete resume",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// POST for duplication: /api/resumes/[id]?action=duplicate
export const POST: APIRoute = async ({ params, request }) => {
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
      return new Response(JSON.stringify({ success: false, error: "ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const [existing] = await db
      .select()
      .from(resume)
      .where(and(eq(resume.id, id), eq(resume.userId, session.user.id)))
      .limit(1);

    if (!existing) {
      return new Response(JSON.stringify({ success: false, error: "Resume not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch the latest version snapshot if available to duplicate exact LaTeX and assets
    const [latestVersion] = await db
      .select()
      .from(resumeVersion)
      .where(eq(resumeVersion.resumeId, existing.id))
      .orderBy(desc(resumeVersion.versionNumber))
      .limit(1);

    const newId = crypto.randomUUID();
    const newVersionId = crypto.randomUUID();
    const now = new Date();
    const newName = `${existing.name} (Copy)`;

    const parsedData = parseResumeData(existing.data);
    const rawLatex = latestVersion?.rawLatex || generateCleanModern(parsedData);
    const sourceKey =
      latestVersion?.sourceKey || `resumes/local/${newId}/source/${newVersionId}.tex`;

    // 1. Insert duplicated resume
    await db.insert(resume).values({
      id: newId,
      userId: session.user.id,
      name: newName,
      data: parsedData,
      templateId: existing.templateId || "clean-modern",
      currentVersionId: newVersionId,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Clone initial version record for the duplicated resume
    await db.insert(resumeVersion).values({
      id: newVersionId,
      resumeId: newId,
      versionNumber: 1,
      sourceKey,
      pdfKey: latestVersion?.pdfKey || null,
      structuredData: parsedData,
      rawLatex,
      isLatexCustom: latestVersion?.isLatexCustom ?? true,
      changeSummary: `Duplicated from "${existing.name}" at ${now.toLocaleTimeString()}`,
      createdAt: now,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: newId,
          name: newName,
          data: parsedData,
          currentVersionId: newVersionId,
          createdAt: now,
          updatedAt: now,
        },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to duplicate resume",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
