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

    const body = await request.json();
    const { message, currentLatex, resumeId, conversationHistory = [] } = body;

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ success: false, error: "Prompt message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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

    const ai = getGeminiClient(locals) || getGeminiClient(env);

    const systemInstruction = `You are an expert AI resume assistant and LaTeX typesetter inside an interactive LaTeX Resume Studio.
You have FULL ACCESS to the user's active LaTeX document.
YOUR CAPABILITIES:
1. You can modify, add, reorder, rewrite, and format any section of the LaTeX resume.
2. If asked to tailor to a job description, reword and emphasize existing relevant achievements, metrics, and tech keywords (never fabricate degrees or companies).
3. If asked to fix errors or balance syntax, diagnose the issue and fix the LaTeX source directly.
4. When writing bullet points, use Google's XYZ formula ("Accomplished [X] as measured by [Y], by doing [Z]").
5. ALWAYS produce fully compilable LaTeX. Ensure all special characters (% $ & _ # ~ ^ { }) in text content are properly escaped so the document never breaks.
6. Return your response in STRICT JSON format with keys:
   - "reply": Markdown summary of what you modified and why (keep it concise, professional, and clear).
   - "updatedLatex": The complete updated LaTeX document with your changes applied.
   - "suggestedPrompts": 2-3 brief follow-up suggestions the user might want next.`;

    interface HistoryItem {
      role?: string;
      content?: string;
    }
    const recentHistory = (
      Array.isArray(conversationHistory) ? (conversationHistory as HistoryItem[]) : []
    )
      .slice(-4)
      .map((h) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content || "" }],
      }));

    const prompt = `Current LaTeX Document:
\`\`\`latex
${currentLatex || ""}
\`\`\`

User Request: "${message}"

Please modify the LaTeX document to fulfill this request. Return strictly valid JSON adhering to:
{
  "reply": "Summary of changes made",
  "updatedLatex": "\\\\documentclass...\\\\end{document}",
  "suggestedPrompts": ["Next prompt suggestion 1", "Next prompt suggestion 2"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...recentHistory,
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "{}";
    interface CopilotResponse {
      reply?: string;
      updatedLatex?: string;
      suggestedPrompts?: string[];
    }
    let parsed: CopilotResponse = {};
    try {
      parsed = JSON.parse(responseText);
    } catch {
      throw new Error("Failed to parse AI response. Please try again.");
    }

    // Log AI call in audit table
    try {
      await db.insert(aiGeneration).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        resumeId: resumeId || null,
        kind: "copilot",
        promptSummary: message.slice(0, 100),
        model: "gemini-2.5-flash",
        createdAt: new Date(),
      });
    } catch (dbErr) {
      console.warn("[ai/copilot] Database logging warning:", dbErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          reply: parsed.reply || "Document updated successfully.",
          updatedLatex: parsed.updatedLatex || currentLatex,
          suggestedPrompts: parsed.suggestedPrompts || [
            "Quantify bullet points with metrics",
            "Make summary more punchy",
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ai/copilot] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "AI Copilot request failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
