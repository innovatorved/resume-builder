"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { createResumeSchema, updateResumeSchema, type ResumeData } from "@/lib/validations/resume";
import { revalidatePath } from "next/cache";

// Get authenticated user
async function getAuthUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return session.user;
}

// Get all resumes for the authenticated user
export async function getResumes() {
  try {
    const user = await getAuthUser();

    const resumes = await prisma.resume.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        data: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      data: resumes.map((resume: any) => ({
        ...resume,
        data: resume.data as ResumeData,
      })),
    };
  } catch (error) {
    console.error("Error fetching resumes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch resumes",
    };
  }
}

// Get a single resume by ID
export async function getResume(id: string) {
  try {
    const user = await getAuthUser();

    const resume = await prisma.resume.findUnique({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        data: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!resume) {
      return {
        success: false,
        error: "Resume not found",
      };
    }

    return {
      success: true,
      data: {
        ...resume,
        data: resume.data as ResumeData,
      },
    };
  } catch (error) {
    console.error("Error fetching resume:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch resume",
    };
  }
}

// Create a new resume
export async function createResume(input: { name: string; data: ResumeData }) {
  try {
    const user = await getAuthUser();

    // Validate input
    const validated = createResumeSchema.parse(input);

    const resume = await prisma.resume.create({
      data: {
        name: validated.name,
        data: validated.data as any,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        data: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    revalidatePath("/");

    return {
      success: true,
      data: {
        ...resume,
        data: resume.data as ResumeData,
      },
    };
  } catch (error) {
    console.error("Error creating resume:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create resume",
    };
  }
}

// Update an existing resume
export async function updateResume(input: { id: string; name?: string; data?: ResumeData }) {
  try {
    const user = await getAuthUser();

    // Validate input
    const validated = updateResumeSchema.parse(input);

    // Check if resume exists and belongs to user
    const existingResume = await prisma.resume.findUnique({
      where: {
        id: validated.id,
        userId: user.id,
      },
    });

    if (!existingResume) {
      return {
        success: false,
        error: "Resume not found",
      };
    }

    const resume = await prisma.resume.update({
      where: {
        id: validated.id,
      },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.data && { data: validated.data as any }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        data: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    revalidatePath("/");

    return {
      success: true,
      data: {
        ...resume,
        data: resume.data as ResumeData,
      },
    };
  } catch (error) {
    console.error("Error updating resume:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update resume",
    };
  }
}

// Delete a resume
export async function deleteResume(id: string) {
  try {
    const user = await getAuthUser();

    // Check if resume exists and belongs to user
    const existingResume = await prisma.resume.findUnique({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingResume) {
      return {
        success: false,
        error: "Resume not found",
      };
    }

    await prisma.resume.delete({
      where: {
        id,
      },
    });

    revalidatePath("/");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting resume:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete resume",
    };
  }
}

// Duplicate a resume
export async function duplicateResume(id: string) {
  try {
    const user = await getAuthUser();

    const existingResume = await prisma.resume.findUnique({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingResume) {
      return {
        success: false,
        error: "Resume not found",
      };
    }

    const resume = await prisma.resume.create({
      data: {
        name: `Copy of ${existingResume.name}`,
        data: existingResume.data,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        data: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    revalidatePath("/");

    return {
      success: true,
      data: {
        ...resume,
        data: resume.data as ResumeData,
      },
    };
  } catch (error) {
    console.error("Error duplicating resume:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to duplicate resume",
    };
  }
}
