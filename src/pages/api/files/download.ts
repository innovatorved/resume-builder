import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resume, resumeVersion } from "@/lib/db/schema";
import { createPresignedDownloadUrl, isR2Configured } from "@/lib/r2/presigned";

export const GET: APIRoute = async ({ request, locals }) => {
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
    const versionId = url.searchParams.get("versionId");
    const resumeId = url.searchParams.get("resumeId");
    const fileType = url.searchParams.get("fileType") || "pdf"; // pdf | source
    const redirect = url.searchParams.get("redirect") !== "false";

    if (!versionId && !resumeId) {
      return new Response(
        JSON.stringify({ success: false, error: "versionId or resumeId is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (fileType !== "pdf" && fileType !== "source") {
      return new Response(JSON.stringify({ success: false, error: "Invalid fileType" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fields = {
      versionId: resumeVersion.id,
      versionNumber: resumeVersion.versionNumber,
      resumeId: resumeVersion.resumeId,
      sourceKey: resumeVersion.sourceKey,
      pdfKey: resumeVersion.pdfKey,
      resumeName: resume.name,
      userId: resume.userId,
    };

    const [record] = resumeId
      ? await db
          .select(fields)
          .from(resume)
          .innerJoin(resumeVersion, eq(resume.currentVersionId, resumeVersion.id))
          .where(and(eq(resume.id, resumeId), eq(resume.userId, session.user.id)))
          .limit(1)
      : await db
          .select(fields)
          .from(resumeVersion)
          .innerJoin(resume, eq(resumeVersion.resumeId, resume.id))
          .where(and(eq(resumeVersion.id, versionId ?? ""), eq(resume.userId, session.user.id)))
          .limit(1);

    if (!record) {
      return new Response(JSON.stringify({ success: false, error: "Saved resume not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const key = fileType === "source" ? record.sourceKey : record.pdfKey;

    if (!key) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            fileType === "pdf"
              ? "No saved PDF is available. Open the resume and save it first."
              : "File not available for this version",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const expectedPrefix = `resumes/${session.user.id}/${record.resumeId}/${fileType}/`;
    if (!key.startsWith(expectedPrefix)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid saved file" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const safeTitle = record.resumeName.toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "resume";
    const filename = `${safeTitle}-v${record.versionNumber}.${fileType === "source" ? "tex" : "pdf"}`;

    const env =
      (locals as { runtime?: { env?: Record<string, string | undefined> } }).runtime?.env ||
      process.env;

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

    const downloadUrl = await createPresignedDownloadUrl({
      key,
      filename,
      env,
    });

    if (redirect) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: downloadUrl,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { downloadUrl, filename },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[download] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate download URL",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
