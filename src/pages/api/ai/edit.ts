import type { APIRoute } from "astro";
import { getGeminiClient, isGeminiConfigured } from "@/lib/ai/gemini-client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiGeneration } from "@/lib/db/schema";

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
      text?: string;
      prompt?: string;
      mode?: string;
      resumeId?: string;
    };
    const { text, prompt: userPrompt, mode, resumeId } = body;

    if (!text && !userPrompt) {
      return new Response(
        JSON.stringify({ success: false, error: "Text or instruction prompt is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const env = (locals as any)?.runtime?.env || locals || process.env;

    if (!isGeminiConfigured(locals) && !isGeminiConfigured(env)) {
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

    const ai = getGeminiClient(env);

    let systemInstruction = `You are an elite executive resume writer and career strategist.
Your task is to enhance resume bullet points and descriptions to be high-impact, quantified, and ATS-friendly.
Follow Google's XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]".
Never fabricate facts or dates, but strongly emphasize technical decisions, scope, and business outcomes.`;

    if (mode === "concise") {
      systemInstruction +=
        "\nFocus on brevity: eliminate fluff words while preserving technical keywords and impact.";
    } else if (mode === "executive") {
      systemInstruction +=
        "\nFocus on high-level strategic impact, cross-functional leadership, and organizational metrics.";
    }

    const prompt = `Here is the current resume text:
"""
${text || ""}
"""

User instruction: ${userPrompt || "Rewrite this bullet point to be much more impactful using the Google XYZ formula."}

Return a JSON response with:
{
  "improved": "The single best revised version",
  "alternatives": ["Alternative variation 1", "Alternative variation 2"],
  "explanation": "Brief 1-sentence explanation of what was strengthened"
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
      parsed = { improved: contentText, alternatives: [] };
    }

    // Log AI call for audit and rate-tracking
    try {
      await db.insert(aiGeneration).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        resumeId: resumeId || null,
        kind: "rewrite",
        promptSummary: userPrompt || mode || "Bullet rewrite",
        model: "gemini-2.5-flash",
        createdAt: new Date(),
      });
    } catch (dbErr) {
      console.warn("[ai/edit] Failed to log generation:", dbErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: parsed,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ai/edit] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "AI generation failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
