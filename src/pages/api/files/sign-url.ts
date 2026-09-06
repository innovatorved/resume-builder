import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resume } from "@/lib/db/schema";
import { createPresignedUploadUrl, isR2Configured } from "@/lib/r2/presigned";

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

    const body = await request.json();
    const { resumeId, versionId, type, contentType, extension } = body;

    if (!resumeId || !versionId || !type || !contentType) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: resumeId, versionId, type, contentType",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (type !== "source" && type !== "pdf" && type !== "uploads") {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid type. Must be source, pdf, or uploads" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify ownership of the resume if it's not a newly assigned ID
    const [existing] = await db
      .select({ id: resume.id })
      .from(resume)
      .where(and(eq(resume.id, resumeId), eq(resume.userId, session.user.id)))
      .limit(1);

    // If resume does not exist yet (creating new resume with first version), allow it only if owned by session
    // Check if another user owns this resumeId
    const [otherOwner] = await db
      .select({ id: resume.id })
      .from(resume)
      .where(eq(resume.id, resumeId))
      .limit(1);

    if (otherOwner && !existing) {
      return new Response(JSON.stringify({ success: false, error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Cloudflare environment bindings can come from locals.runtime.env if deployed
    const env = (locals as any)?.runtime?.env || process.env;

    if (!isR2Configured(env)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cloudflare R2 storage is not configured yet on this instance.",
          notConfigured: true,
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const { uploadUrl, key } = await createPresignedUploadUrl({
      userId: session.user.id,
      resumeId,
      versionId,
      type,
      contentType,
      extension,
      env,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: { uploadUrl, key },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[sign-url] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal error generating upload URL",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
