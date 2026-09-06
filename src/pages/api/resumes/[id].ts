import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resume } from "@/lib/db/schema";
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
    const body = await request.json();
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

    await db.update(resume).set(updateValues).where(eq(resume.id, validated.id));

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

export const DELETE: APIRoute = async ({ params, request }) => {
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
    const [existing] = await db
      .select()
      .from(resume)
      .where(and(eq(resume.id, id!), eq(resume.userId, session.user.id)))
      .limit(1);

    if (!existing) {
      return new Response(JSON.stringify({ success: false, error: "Resume not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const newId = crypto.randomUUID();
    const now = new Date();
    const newName = `Copy of ${existing.name}`;

    await db.insert(resume).values({
      id: newId,
      userId: session.user.id,
      name: newName,
      data: existing.data,
      createdAt: now,
      updatedAt: now,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: newId,
          name: newName,
          data: parseResumeData(existing.data),
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
