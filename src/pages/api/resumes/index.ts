import type { APIRoute } from "astro";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resume } from "@/lib/db/schema";
import { createResumeSchema, type ResumeData } from "@/lib/validations/resume";

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

    const userResumes = await db
      .select({
        id: resume.id,
        name: resume.name,
        data: resume.data,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      })
      .from(resume)
      .where(eq(resume.userId, session.user.id))
      .orderBy(desc(resume.updatedAt));

    return new Response(
      JSON.stringify({
        success: true,
        data: userResumes.map((r) => ({
          ...r,
          data: parseResumeData(r.data),
        })),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch resumes",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
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
    const validated = createResumeSchema.parse(body);
    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(resume).values({
      id,
      userId: session.user.id,
      name: validated.name,
      data: validated.data,
      createdAt: now,
      updatedAt: now,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id,
          name: validated.name,
          data: validated.data,
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
        error: error instanceof Error ? error.message : "Failed to create resume",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
};
