import { type Tool, Type } from "@google/genai";
import type { APIRoute } from "astro";
import { getGeminiClient, isGeminiConfigured } from "@/lib/ai/gemini-client";
import { auth } from "@/lib/auth";
import { getSyncCloudflareEnv } from "@/lib/cloudflare-env";
import { db } from "@/lib/db";
import { aiGeneration } from "@/lib/db/schema";
import {
  fetchUserExistingResumeContext,
  fetchUserProfile,
  searchKnowledgeEvidence,
} from "@/lib/knowledge/retriever";

function cleanJsonText(raw: string): string {
  const text = raw.trim();
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim();
  }
  return text;
}

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
      message?: string;
      currentLatex?: string;
      resumeId?: string;
      conversationHistory?: Array<{ role: string; content?: string; text?: string }>;
    };
    const { message, currentLatex, resumeId, conversationHistory = [] } = body;

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ success: false, error: "Prompt message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const env = getSyncCloudflareEnv(locals);

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

    // Fetch candidate's career knowledge & context concurrently
    const [userProfileData, queryEvidence, existingResumeSummary] = await Promise.all([
      fetchUserProfile(locals, session.user.id),
      searchKnowledgeEvidence(locals, session.user.id, message),
      fetchUserExistingResumeContext(session.user.id, resumeId),
    ]);

    const { profileMarkdown, sources } = userProfileData;

    let candidateKnowledgeContext = `Candidate Name: ${session.user.name || "Candidate"}\nCandidate Email: ${session.user.email || ""}\n`;

    if (sources.length > 0) {
      candidateKnowledgeContext += `Connected Knowledge Sources: ${sources
        .map((s) => `${s.type}${s.name ? ` (${s.name})` : ""}`)
        .join(", ")}\n\n`;
    }

    if (profileMarkdown) {
      candidateKnowledgeContext += `=== VERIFIED CANDIDATE CAREER PROFILE ===\n${profileMarkdown.slice(0, 16000)}\n\n`;
    }

    if (queryEvidence.length > 0) {
      candidateKnowledgeContext += `=== MATCHING CAREER EVIDENCE FOR THIS REQUEST ===\n${queryEvidence
        .map((e) => `[Source: ${e.key}]\n${e.text}`)
        .join("\n\n")
        .slice(0, 8000)}\n\n`;
    }

    if (existingResumeSummary) {
      candidateKnowledgeContext += `=== PRIOR RESUME SNAPSHOTS ===\n${existingResumeSummary.slice(0, 4000)}\n\n`;
    }

    if (!profileMarkdown && sources.length === 0 && !existingResumeSummary) {
      candidateKnowledgeContext += `[Note: No external career sources have been indexed yet in the Career Knowledge Hub.]\n`;
    }

    const systemInstruction = `You are an expert AI resume architect, executive career coach, and LaTeX typesetter inside an interactive LaTeX Resume Studio.
You have access to the user's active LaTeX document AND the candidate's verified career knowledge base.

CRITICAL ATS (APPLICANT TRACKING SYSTEM) COMPLIANCE REQUIREMENTS:
1. STRICT SINGLE-COLUMN LINEAR LAYOUT:
   - ATS text-stream extraction engines read left-to-right across the entire page width. Multi-column tables, sidebars, or packages (parcolumns, multicols) scramble work histories and skills into garbled text.
   - You MUST enforce a clean, single-column vertical layout. Never generate two-column tabular layouts.
2. UNIVERSAL STANDARD SECTION HEADINGS:
   - Modern ATS Named Entity Recognition (NER) models segment documents based on recognized anchor headings.
   - Use only standard headings: "Work Experience" (or "Experience"), "Education", "Technical Skills" (or "Skills"), "Projects", "Certifications".
   - Never invent colloquial headings like "My Journey", "Where I've Been", or "Passions".
3. STANDARD CONTACT HEADER:
   - Place all contact info inside the document body at the top (never in LaTeX running headers or footers, which ATS parsers strip).
   - Format clearly: Full Legal Name, Location (City, State/Country), Phone, Professional Email, LinkedIn URL, GitHub/Portfolio URL.
4. GOOGLE'S XYZ FORMULA FOR BULLET POINTS:
   - Every accomplishment bullet must follow: "Accomplished [X] as measured by [Y], by doing [Z]".
   - Begin every bullet with a strong past-tense action verb (or present-tense for current role): Architected, Engineered, Implemented, Scaled, Automated, Reduced, Spearheaded.
   - Quantify results with metrics (percentages, throughput, latency, user base, cost reduction) wherever supported by candidate knowledge.
5. CATEGORIZED TECHNICAL SKILLS:
   - Organize skills into distinct categories (e.g. Languages: TypeScript, Go, Python; Frameworks & Runtimes: React, Astro, Node.js; Cloud & DevOps: Cloudflare Workers, AWS, Docker; Databases & Storage: PostgreSQL, Turso, Redis).
   - NEVER use visual rating bars, progress meters, percentages (e.g. "90% Python"), or icons without text labels. ATS parsers treat graphic meters as unparseable noise or penalties.
6. STANDARDIZED DATES:
   - Format all date ranges as "Month YYYY -- Month YYYY" or "Month YYYY -- Present" (e.g., "June 2022 -- Present").
7. NO PHOTOS, NO TABLES, ESCAPED LATEX CHARACTERS:
   - Never include headshots or images (triggers OCR errors and EEOC rejection).
   - Always escape special LaTeX characters (% $ & _ # ~ ^ { }) in text content to guarantee 100% error-free compilation.

CRITICAL GROUNDING PRINCIPLES:
1. NEVER emit dummy placeholders like "[Company Name]", "[Your Name]", "[University]", "[Project Title]", or "[Achievement X]" when the candidate's career knowledge is provided. Always populate the resume with the candidate's actual work history, verified company names, real dates, actual degrees, real GitHub projects, skills, and certifications.
2. If the user asks to "create a standard resume based on knowledge of mine", "generate resume from my background", or similar, construct a complete, professional, compilable LaTeX resume populated entirely with their verified career data following the ATS rules above.
3. When tailoring to a job description or target role:
   - Cross-reference the requirements in the job description against what the candidate actually knows and has done.
   - Emphasize and prioritize matching keywords and technologies that the candidate actually possesses (for ATS keyword/token filters).
   - Highlight certifications prominently in the skills/education/certifications section.
   - Phrase bullet points using Google's XYZ formula.
   - Never fabricate fictional employers or degrees.
4. When the user asks for purely cosmetic, layout, or syntax fixes (e.g. font size, margins, spacing, balancing braces, fixing compilation errors), apply the LaTeX adjustments without altering candidate facts.
5. ALWAYS produce fully compilable LaTeX.
6. Return your response in STRICT JSON format with keys:
   - "reply": Markdown summary of what you modified, how the candidate's real experience and skills were applied, and why (keep it concise, professional, and clear).
   - "updatedLatex": The complete updated LaTeX document with your changes applied.
   - "suggestedPrompts": 2-3 brief, relevant follow-up suggestions for the next step.`;

    const tools: Tool[] = [
      {
        functionDeclarations: [
          {
            name: "search_career_knowledge",
            description:
              "Search the candidate's verified career knowledge base (LinkedIn, GitHub repositories, portfolios, uploaded resumes, certifications, projects, work history). Use this when tailoring to specific job descriptions or looking up detailed evidence, metrics, or technologies.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                query: {
                  type: Type.STRING,
                  description:
                    "Specific search query for candidate's knowledge base (e.g., 'Google SWE requirements', 'certifications', 'Cloudflare backend', 'distributed systems').",
                },
              },
              required: ["query"],
            },
          },
          {
            name: "get_career_profile",
            description:
              "Retrieve the candidate's complete synthesized career profile summary assembled from all connected sources.",
          },
        ],
      },
    ];

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

    const prompt = `${candidateKnowledgeContext}
Current LaTeX Document:
\`\`\`latex
${currentLatex || ""}
\`\`\`

User Request: "${message}"

Please modify or generate the LaTeX document to fulfill this request using the candidate's real career details. Return strictly valid JSON adhering to:
{
  "reply": "Summary of changes made",
  "updatedLatex": "\\\\documentclass...\\\\end{document}",
  "suggestedPrompts": ["Next prompt suggestion 1", "Next prompt suggestion 2"]
}`;

    const currentContents: any[] = [
      ...recentHistory,
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ];

    let finalResponseText = "";
    const MAX_TOOL_TURNS = 2;

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: currentContents,
        config: {
          systemInstruction,
          tools,
        },
      });

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          currentContents.push({
            role: "model",
            parts: [{ functionCall: call }],
          });

          let toolResult: any = null;
          if (call.name === "search_career_knowledge") {
            const queryArg = String((call.args as any)?.query || message);
            const chunks = await searchKnowledgeEvidence(locals, session.user.id, queryArg);
            toolResult = {
              query: queryArg,
              matchedEvidence: chunks.map((c) => ({
                source: c.key,
                content: c.text,
              })),
            };
          } else if (call.name === "get_career_profile") {
            const prof = await fetchUserProfile(locals, session.user.id);
            toolResult = {
              profile: prof.profileMarkdown || "No profile available yet.",
              sources: prof.sources,
            };
          } else {
            toolResult = { error: `Unknown tool: ${call.name}` };
          }

          currentContents.push({
            role: "user",
            parts: [
              {
                functionResponse: {
                  name: call.name,
                  response: toolResult,
                },
              },
            ],
          });
        }
      } else {
        finalResponseText = response.text || "";
        break;
      }
    }

    interface CopilotResponse {
      reply?: string;
      updatedLatex?: string;
      suggestedPrompts?: string[];
    }

    let parsed: CopilotResponse = {};
    if (finalResponseText) {
      try {
        parsed = JSON.parse(cleanJsonText(finalResponseText));
      } catch {
        // Fallback: request structured JSON explicitly
        try {
          const jsonCall = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              ...currentContents,
              {
                role: "user",
                parts: [
                  {
                    text: "Format your previous output in strictly valid JSON with keys: reply, updatedLatex, suggestedPrompts.",
                  },
                ],
              },
            ],
            config: {
              systemInstruction,
              responseMimeType: "application/json",
            },
          });
          parsed = JSON.parse(cleanJsonText(jsonCall.text || "{}"));
        } catch {
          parsed = {
            reply: finalResponseText,
            updatedLatex: currentLatex,
          };
        }
      }
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
          reply: parsed.reply || "Document updated successfully with your career background.",
          updatedLatex: parsed.updatedLatex || currentLatex,
          suggestedPrompts: parsed.suggestedPrompts || [
            "Tailor to a target job description",
            "Quantify bullet points with Google XYZ metrics",
            "Highlight my key certifications and skills",
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
