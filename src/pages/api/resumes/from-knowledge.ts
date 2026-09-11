import type { APIRoute } from "astro";
import { getGeminiClient, isGeminiConfigured } from "@/lib/ai/gemini-client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resume, resumeVersion } from "@/lib/db/schema";
import {
  fetchUserExistingResumeContext,
  fetchUserProfile,
  searchKnowledgeEvidence,
} from "@/lib/knowledge/retriever";
import { generateCleanModern } from "@/lib/templates";
import { validateLatexSyntax } from "@/lib/latex/validator";
import type { ResumeData } from "@/types/resume";

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

    const userId = session.user.id;
    const userName = session.user.name || "";
    const userEmail = session.user.email || "";

    // 1. Retrieve all user career knowledge evidence
    const [profileResult, evidenceChunks, existingResumeContext] = await Promise.all([
      fetchUserProfile(locals, userId),
      searchKnowledgeEvidence(
        locals,
        userId,
        "experience work history key projects technical skills certifications education"
      ),
      fetchUserExistingResumeContext(userId),
    ]);

    const { profileMarkdown, sources = [] } = profileResult;
    const hasProfile = Boolean(profileMarkdown && profileMarkdown.trim().length > 20);
    const hasSources = sources && sources.length > 0;
    const hasEvidence = evidenceChunks && evidenceChunks.length > 0;
    const hasExistingResume = Boolean(existingResumeContext && existingResumeContext.trim().length > 20);

    if (!hasProfile && !hasSources && !hasEvidence && !hasExistingResume) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "No knowledge sources found. Please add at least one career source (GitHub, Portfolio, LinkedIn, or Document) to your Evidence Library first.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Build career knowledge prompt context
    let contextText = `User Account Info:\n- Name: ${userName}\n- Email: ${userEmail}\n\n`;

    if (profileMarkdown) {
      contextText += `=== USER SYNTHESIZED CAREER PROFILE ===\n${profileMarkdown}\n\n`;
    }

    if (evidenceChunks.length > 0) {
      contextText += `=== RETRIEVED CAREER EVIDENCE FACTS ===\n`;
      evidenceChunks.forEach((chunk, i) => {
        contextText += `[Evidence ${i + 1}] (${chunk.key}):\n${chunk.text}\n\n`;
      });
    }

    if (existingResumeContext) {
      contextText += `=== PRIOR RESUME HISTORY ===\n${existingResumeContext}\n\n`;
    }

    let generatedName = `${userName ? `${userName}'s` : "Career"} Resume (from Knowledge)`;
    let structuredResumeData: ResumeData | null = null;
    let finalLatex = "";

    // 3. AI Generation via Gemini
    if (isGeminiConfigured(locals)) {
      try {
        const client = getGeminiClient(locals);

        const systemPrompt = `You are an elite ATS resume architect and LaTeX document typesetter.
Your task is to transform the user's verified career knowledge, repositories, and evidence into a high-converting, ATS-compliant LaTeX resume.

CRITICAL INSTRUCTIONS & CONSTRAINTS:
1. STRICT FACTUAL ACCURACY: Use ONLY verified facts, companies, technologies, projects, and achievements from the provided user evidence. NEVER hallucinate or invent fake companies, degrees, or metrics.
2. OMIT UNSHARED / MISSING SECTIONS: If any details or sections (such as Certifications, Languages, Phone Number, GPA, or Location) are NOT present in the user's knowledge, COMPLETELY OMIT THEM. Do not output empty sections, blank brackets, or placeholder text like "Alex Morgan" or "Professional Title".
3. LATEX TEMPLATE STRUCTURE:
The output LaTeX MUST strictly follow this styling:
- Document class: \\documentclass[10pt,a4paper]{article}
- Packages: inputenc, fontenc (T1), geometry (margin=0.5in), titlesec, enumitem, hyperref, xcolor, lato [default]
- Colors: \\definecolor{primary}{HTML}{2b2b2b}, \\definecolor{accent}{HTML}{003366}
- Heading: \\titleformat{\\section}{\\large\\bfseries\\scshape\\raggedright}{}{0em}{}[\\titlerule] with \\titlespacing{\\section}{0pt}{7pt}{5pt}
- Header: Centered, {\\Huge \\textbf{NAME}}, {\\color{accent} \\large Title}, contact items separated by \\ $|$ \\ 
- Technical Skills: categorized bullets using \\begin{itemize}[leftmargin=0.15in, labelsep=0.5em, itemsep=-2pt] with \\item \\textbf{Category:} skill 1, skill 2...
- Professional Experience: \\textbf{Company} \\hfill Location \\\\ \\textit{Role} \\hfill Dates followed by \\begin{itemize}[noitemsep, topsep=2pt] with quantified Google XYZ bullets.
- Key Projects: \\textbf{Project Name} $|$ \\textit{Technologies} \\hfill Date followed by \\begin{itemize}[noitemsep, topsep=0pt].
- Certifications (only if found): \\item \\textbf{Cert} | \\textit{Issuer} \\hfill Date
- Education: \\textbf{Institution} \\hfill Dates \\\\ Degree \\hfill Location
- Languages (only if found): \\textbf{Language} (Proficiency)...
4. PROPER LATEX ESCAPING: Escape all special characters (&, %, _, $, #) as \\&, \\%, \\_, \\$, \\#. Do not use double escapes.

OUTPUT FORMAT:
Return a strictly valid JSON object with:
{
  "name": "Short descriptive resume title (e.g. Cloud Engineer Resume)",
  "data": {
    "personalInfo": { "name": "...", "title": "...", "phone": "...", "email": "...", "linkedin": "...", "github": "...", "location": "..." },
    "summary": "...",
    "skills": ["Cloud & Infrastructure: Azure, GCP, Terraform", "DevOps: Docker, Kubernetes, CI/CD"],
    "experience": [{ "company": "...", "title": "...", "location": "...", "startDate": "...", "endDate": "...", "responsibilities": ["..."] }],
    "projects": [{ "title": "...", "technologies": "...", "date": "...", "description": "..." }],
    "education": [{ "institution": "...", "degree": "...", "location": "...", "startDate": "...", "endDate": "..." }],
    "certifications": [{ "title": "...", "issuer": "...", "date": "..." }],
    "languages": [{ "name": "...", "level": "..." }]
  },
  "latex": "\\documentclass[10pt,a4paper]{article}..."
}`;

        const response = await client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${systemPrompt}\n\nHere is the verified career knowledge and evidence for the candidate:\n${contextText}`,
                },
              ],
            },
          ],
        });

        const rawReply = response.text || "";
        const cleaned = cleanJsonText(rawReply);
        const parsed = JSON.parse(cleaned) as {
          name?: string;
          data?: ResumeData;
          latex?: string;
        };

        if (parsed.name) generatedName = parsed.name;
        if (parsed.data) structuredResumeData = parsed.data;
        if (parsed.latex && parsed.latex.includes("\\begin{document}")) {
          // Validate syntax
          const syntaxErrors = validateLatexSyntax(parsed.latex);
          if (syntaxErrors.length === 0) {
            finalLatex = parsed.latex;
          }
        }
      } catch (aiErr) {
        console.warn("[from-knowledge] Gemini generation failed, falling back to deterministic template:", aiErr);
      }
    }

    // 4. Fallback if AI was unavailable or invalid
    if (!structuredResumeData) {
      structuredResumeData = {
        personalInfo: {
          name: userName || "Professional Candidate",
          title: "Cloud & Software Engineer",
          email: userEmail,
          phone: "",
          location: "",
        },
        summary: profileMarkdown ? profileMarkdown.slice(0, 300).replace(/#+/g, "").trim() : "",
        skills: ["Cloud Architecture", "DevOps & CI/CD", "TypeScript", "Python", "Docker", "Git"],
        experience: [],
        projects: [],
        education: [],
        certifications: [],
        languages: [],
      };
    }

    if (!finalLatex) {
      finalLatex = generateCleanModern(structuredResumeData);
    }

    // 5. Create new resume in database
    const newResumeId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const now = new Date();

    await db.insert(resume).values({
      id: newResumeId,
      userId,
      name: generatedName,
      data: structuredResumeData,
      currentVersionId: versionId,
      templateId: "clean-modern",
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(resumeVersion).values({
      id: versionId,
      resumeId: newResumeId,
      versionNumber: 1,
      sourceKey: `resumes/${userId}/${newResumeId}/source/${versionId}.tex`,
      pdfKey: null,
      structuredData: structuredResumeData,
      rawLatex: finalLatex,
      isLatexCustom: true,
      changeSummary: "Generated from Career Knowledge Base",
      createdAt: now,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: newResumeId,
          name: generatedName,
        },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[from-knowledge] Error generating resume from knowledge:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate resume from knowledge",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
