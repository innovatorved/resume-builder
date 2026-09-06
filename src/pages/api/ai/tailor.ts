import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { getGeminiClient, isGeminiConfigured } from "@/lib/ai/gemini-client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiGeneration, jobPost, resume } from "@/lib/db/schema";
import type { ResumeData } from "@/types/resume";

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
    const { resumeId, jobDescription, company, role } = body;

    if (!resumeId || !jobDescription) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "resumeId and jobDescription are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch the target resume
    const [found] = await db
      .select()
      .from(resume)
      .where(and(eq(resume.id, resumeId), eq(resume.userId, session.user.id)))
      .limit(1);

    if (!found) {
      return new Response(JSON.stringify({ success: false, error: "Resume not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const env = (locals as any)?.runtime?.env || process.env;

    if (!isGeminiConfigured(env)) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Gemini AI is not configured on this instance. Set GEMINI_API_KEY to activate AI features.",
          notConfigured: true,
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const rawData = typeof found.data === "string" ? JSON.parse(found.data) : found.data;
    const currentResume: ResumeData = rawData as ResumeData;

    const ai = getGeminiClient(env);

    const systemInstruction = `You are a world-class career strategist and hiring manager.
Your task is to tailor a candidate's resume for a specific job description.
RULES:
1. NEVER fabricate fake job positions, companies, degrees, or years of experience.
2. Align the professional summary and bullet points to highlight relevant competencies matching the job requirements.
3. Re-order and re-word bullet points using strong keywords from the job description.
4. Extract skills mentioned in the job description that the candidate already has, plus note any missing skills for user awareness.
5. Return strictly valid JSON adhering to the specified format.`;

    const prompt = `Candidate's Current Resume:
${JSON.stringify(currentResume, null, 2)}

Target Job Description:
"""
Company: ${company || "Not specified"}
Role: ${role || "Target Role"}
${jobDescription}
"""

Please analyze and generate a tailored resume. Return JSON format:
{
  "tailoredResume": {
    "personalInfo": { ...same candidate personal info... },
    "summary": "Tailored executive summary matching this role",
    "experience": [
      {
        "title": "...",
        "company": "...",
        "location": "...",
        "startDate": "...",
        "endDate": "...",
        "description": "...",
        "responsibilities": ["Tailored bullet 1 with relevant metrics", "Tailored bullet 2..."]
      }
    ],
    "education": [ ... ],
    "skills": ["Prioritized relevant skills matching JD...", ...],
    "certifications": [ ... ],
    "projects": [ ... ],
    "languages": [ ... ]
  },
  "alignmentAnalysis": {
    "matchScorePercent": 85,
    "matchingKeywords": ["Skill A", "Technology B", "Cloud C"],
    "missingKeywords": ["Desired skill not in resume"],
    "summaryOfChanges": "Re-focused summary on cloud architecture and prioritized Kubernetes accomplishments."
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const contentText = response.text || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(contentText);
    } catch {
      throw new Error("Failed to parse structured response from AI");
    }

    // Save job post record
    const jobPostId = crypto.randomUUID();
    const now = new Date();

    try {
      await db.insert(jobPost).values({
        id: jobPostId,
        userId: session.user.id,
        resumeId,
        title: role || "Target Role",
        company: company || null,
        rawText: jobDescription,
        parsedRequirementsJson: parsed.alignmentAnalysis || null,
        targetKeywords: parsed.alignmentAnalysis?.matchingKeywords || null,
        createdAt: now,
      });

      await db.insert(aiGeneration).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        resumeId,
        jobPostId,
        kind: "tailor",
        promptSummary: `Tailor for ${company || "company"} - ${role || "role"}`,
        model: "gemini-2.5-flash",
        createdAt: now,
      });
    } catch (dbErr) {
      console.warn("[ai/tailor] Database logging warning:", dbErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          jobPostId,
          tailoredResume: parsed.tailoredResume || currentResume,
          alignmentAnalysis: parsed.alignmentAnalysis || {},
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ai/tailor] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Tailoring failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
