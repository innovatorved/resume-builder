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

    const { profileMarkdown, sources = [], sourceDocuments = [] } = profileResult;
    const hasProfile = Boolean(profileMarkdown && profileMarkdown.trim().length > 20);
    const hasSources = sources && sources.length > 0;
    const hasSourceDocs = sourceDocuments && sourceDocuments.length > 0;
    const hasEvidence = evidenceChunks && evidenceChunks.length > 0;
    const hasExistingResume = Boolean(existingResumeContext && existingResumeContext.trim().length > 20);

    if (!hasProfile && !hasSources && !hasEvidence && !hasExistingResume && !hasSourceDocs) {
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

    if (sourceDocuments.length > 0) {
      contextText += `=== RAW EVIDENCE SOURCE DOCUMENTS ===\n`;
      sourceDocuments.forEach((doc, i) => {
        contextText += `[Source ${i + 1}: ${doc.name || doc.type} (${doc.type})]\n${doc.content.slice(0, 4000)}\n\n`;
      });
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

        const systemInstruction = `You are an elite ATS resume architect and technical career strategist.
Your task is to analyze the candidate's verified career evidence and construct a high-impact, ATS-optimized structured resume.

CRITICAL RULES & CONSTRAINTS:
1. STRICT FACTUAL ACCURACY:
   - Use ONLY verified facts, companies, technologies, projects, and achievements from the candidate's evidence.
   - NEVER hallucinate, invent, or infer unverified companies, degrees, dates, metrics, or certifications.
2. INTELLIGENT CURATION (HIGH IMPACT & CONCISE):
   - Choose ONLY the most necessary, high-impact career facts suitable for a pristine single-page resume.
   - Professional Experience: Select 2-4 most impactful professional roles (or all if candidate has fewer).
   - Accomplishment Bullets: Write 2-4 bullet points per role following Google's XYZ formula ("Accomplished [X] as measured by [Y], by doing [Z]").
   - Highlight key metrics and results using markdown bold (e.g. "**35% reduction in latency**", "**10k+ active users**", "**\$2M revenue impact**").
   - Technical Skills: Group skills into 3-5 clear categories (e.g. "Cloud & Infrastructure: ...", "DevOps & Tools: ...", "Languages & Frameworks: ...", "Databases: ..."). List specific tools and technologies.
   - Key Projects: Select 2-3 standout projects featuring verified technologies and measurable achievements.
   - Education: Include verified degrees, institutions, and graduation years.
   - Certifications: Include ONLY if verified in evidence.
   - Languages: Include ONLY if verified in evidence.
3. CLEAN OMISSION:
   - If any section or contact detail (Phone, Location, LinkedIn, GitHub, Portfolio Website, Certifications, Languages) is NOT in the verified evidence, leave it empty or null.
   - NEVER output fake placeholders (like "city, state", "+1 234-567-8900", "example.com", or "Candidate Title").
4. ACCURATE PERSONAL INFO:
   - Name: Use candidate's real name from evidence or account.
   - Title: Precise, professional headline reflecting their verified background (e.g. "Cloud Engineer", "DevOps Engineer", "Full Stack Software Engineer").
   - Email, Phone, LinkedIn, GitHub, Website, Location: Extract exact values from evidence if available.

OUTPUT FORMAT:
Return a JSON object conforming strictly to:
{
  "name": "Short descriptive resume title (e.g. Cloud Engineer Resume)",
  "personalInfo": {
    "name": "Candidate Full Name",
    "title": "Professional Title",
    "email": "user@example.com",
    "phone": "+91 1234567890",
    "linkedin": "linkedin.com/in/username",
    "github": "github.com/username",
    "website": "example.com",
    "location": "City, Country"
  },
  "summary": "Brief 2-3 sentence executive summary highlighting core expertise, major domains, and top accomplishments.",
  "skills": [
    "Category Name: Tech1, Tech2, Tech3, Tech4",
    "Category Name: Tech1, Tech2, Tech3, Tech4"
  ],
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "location": "City, Country",
      "startDate": "Month YYYY",
      "endDate": "Month YYYY or Present",
      "responsibilities": [
        "Accomplished [X] as measured by **[metric Y]**, by doing [Z].",
        "Engineered [X] resulting in **[metric Y]**, utilizing [Z]."
      ]
    }
  ],
  "projects": [
    {
      "title": "Project Name",
      "technologies": "Tech1, Tech2, Tech3",
      "date": "Month YYYY",
      "description": "Architected [system] delivering **[metric]** with [technologies].\\nOptimized [component] achieving **[metric]**."
    }
  ],
  "education": [
    {
      "institution": "Institution Name",
      "degree": "Degree / Major",
      "location": "City, Country",
      "startDate": "YYYY",
      "endDate": "YYYY"
    }
  ],
  "certifications": [
    {
      "title": "Certification Name",
      "issuer": "Issuing Authority",
      "date": "Month YYYY"
    }
  ],
  "languages": [
    {
      "name": "Language",
      "level": "Proficiency"
    }
  ]
}`;

        const response = await client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Synthesize a high-converting, ATS-optimized resume from the following candidate verified evidence:\n\n${contextText}`,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
          },
        });

        const rawReply = response.text || "{}";
        const cleaned = cleanJsonText(rawReply);
        const parsed = JSON.parse(cleaned) as {
          name?: string;
          personalInfo?: Partial<ResumeData["personalInfo"]>;
          summary?: string;
          skills?: string[];
          experience?: Partial<ResumeData["experience"][number]>[];
          projects?: Partial<ResumeData["projects"][number]>[];
          education?: Partial<ResumeData["education"][number]>[];
          certifications?: Partial<ResumeData["certifications"][number]>[];
          languages?: Partial<ResumeData["languages"][number]>[];
          data?: Partial<ResumeData>;
        };

        const rawPI = parsed.personalInfo || parsed.data?.personalInfo;
        const personalInfo: ResumeData["personalInfo"] = {
          name: rawPI?.name || userName || "Candidate Name",
          title: rawPI?.title || "Professional",
          email: rawPI?.email || userEmail || "",
          phone: rawPI?.phone || "",
          location: rawPI?.location || "",
          linkedin: rawPI?.linkedin || undefined,
          github: rawPI?.github || undefined,
          website: rawPI?.website || undefined,
        };

        const rawExp = parsed.experience || parsed.data?.experience || [];
        const rawProj = parsed.projects || parsed.data?.projects || [];
        const rawEdu = parsed.education || parsed.data?.education || [];
        const rawCert = parsed.certifications || parsed.data?.certifications || [];
        const rawLang = parsed.languages || parsed.data?.languages || [];

        const data: ResumeData = {
          personalInfo,
          summary: parsed.summary || parsed.data?.summary || "",
          skills: parsed.skills || parsed.data?.skills || [],
          experience: rawExp.map((exp) => ({
            company: exp.company || "",
            title: exp.title || "",
            location: exp.location || "",
            startDate: exp.startDate || "",
            endDate: exp.endDate || "",
            description: exp.description || "",
            responsibilities: Array.isArray(exp.responsibilities) ? exp.responsibilities : [],
          })),
          projects: rawProj.map((proj) => ({
            title: proj.title || "",
            description: proj.description || "",
            technologies: proj.technologies || "",
            date: proj.date || "",
            link: proj.link || undefined,
          })),
          education: rawEdu.map((edu) => ({
            institution: edu.institution || "",
            degree: edu.degree || "",
            location: edu.location || "",
            startDate: edu.startDate || "",
            endDate: edu.endDate || "",
          })),
          certifications: rawCert.map((cert) => ({
            title: cert.title || "",
            issuer: cert.issuer || "",
            date: cert.date || "",
            link: cert.link || undefined,
            skills: cert.skills || undefined,
          })),
          languages: rawLang.map((lang) => ({
            name: lang.name || "",
            level: lang.level || "",
          })),
        };

        structuredResumeData = data;
        if (parsed.name) generatedName = parsed.name;
        finalLatex = generateCleanModern(structuredResumeData);
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
