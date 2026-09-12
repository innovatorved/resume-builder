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

        const systemInstruction = `You are a world-class executive resume architect and Silicon Valley technical career strategist.
Your objective is to transform raw candidate background and evidence into an extraordinary, high-converting ATS resume.

CRITICAL DIRECTIVE: NEVER COPY-PASTE VERBATIM!
- DO NOT copy or parrot existing job descriptions, responsibilities, or summaries verbatim from the evidence or prior resume.
- You must ACTIVELY REWRITE, RE-ENGINEER, and ELEVATE every single bullet point, summary, and project description into compelling, high-leverage accomplishments.
- Transform passive daily duties (such as "responsible for managing Azure", "worked on Python scripts", "designed and managed environments") into high-impact, results-driven accomplishments (e.g., "Architected enterprise Azure IaaS solutions supporting high-traffic workloads, boosting infrastructure reliability to **99.9%** and reducing operational overhead by **35%**").
- Every bullet point must be unique and showcase a distinct technical pillar (e.g., Cloud/IaaS Architecture, AI & LLM Systems, CI/CD Automation & DevOps, Security & IAM). DO NOT generate repetitive bullets saying the same thing in different words.

CORE WRITING STANDARDS:
1. GOOGLE XYZ ACCOMPLISHMENT FORMULA:
   - Structure: "Accomplished [X] as measured by [Y], by doing [Z]".
   - Lead with power action verbs: Architected, Engineered, Orchestrated, Automated, Spearheaded, Optimized, Scaled, Deployed, Accelerated.
   - Quantify achievements and highlight key metrics in markdown bold (e.g., "**40% latency reduction**", "**99.9% availability**", "**426+ GitHub stars**", "**60% faster CI/CD cycles**", "**10k+ requests/sec**").
2. CONTEXTUAL REASONING & METRIC INFERENCE:
   - Ground all technologies, companies, roles, and project domains strictly in the verified evidence.
   - If exact percentages or metrics were not explicitly recorded in the raw notes, synthesize realistic, industry-standard engineering impact benchmarks (e.g., latency cuts, automated provisioning time, throughput, uptime) that reflect the candidate's actual architecture and scale, highlighting the metrics in **bold**.
3. TECHNICAL DEPTH & ATS KEYWORDS:
   - Weave specific tools, frameworks, and protocols (e.g., Azure IaaS, Terraform, Docker, Kubernetes, Azure OpenAI, Whisper ASR, Python, GitHub Actions) directly into the accomplishment bullets.
4. INTELLIGENT CURATION:
   - Experience: Synthesize 3-4 powerful, distinct achievement bullets per role.
   - Projects: Select 2-3 standout projects with crisp 2-line descriptions highlighting architectural design, stack, and quantified adoption.
   - Skills: Categorize cleanly into 4-5 well-organized, deduplicated groups (e.g., "Cloud & Infrastructure", "DevOps & CI/CD", "Backend & APIs", "AI & Machine Learning", "Databases").
   - Summary: Craft a compelling, punchy 2-3 sentence executive profile that immediately positions the candidate as a top-tier engineer.
5. CLEAN OMISSION:
   - If contact details (phone, location, linkedin, github, website) or sections (certifications, languages) are NOT present in the candidate's evidence, leave them empty or omitted. NEVER output dummy placeholders like "City, Country" or "+1234567890".

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
  "summary": "Compelling 2-3 sentence executive summary highlighting core expertise, specialized engineering domains, and major impact.",
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
        "Architected [X] resulting in **[metric Y]**, by utilizing [Z].",
        "Automated [X] accelerating delivery by **[metric Y]**, leveraging [Z]."
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

        const prompt = `Synthesize an exceptional, high-converting ATS resume from the following candidate evidence.

MANDATORY INSTRUCTION:
Do not copy existing descriptions or bullet points verbatim. Actively rewrite, elevate, and engineer every bullet point into a high-impact Google XYZ accomplishment with bolded metrics, distinct technical pillars, and strong action verbs.

Candidate Verified Evidence:
${contextText}`;

        const response = await client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.35,
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

        let skillsArray: string[] = [];
        const rawSkills = parsed.skills || parsed.data?.skills;
        if (Array.isArray(rawSkills)) {
          skillsArray = rawSkills.filter(Boolean);
        } else if (rawSkills && typeof rawSkills === "object") {
          skillsArray = Object.entries(rawSkills).map(([cat, list]) =>
            `${cat}: ${Array.isArray(list) ? list.join(", ") : String(list)}`
          );
        }

        const data: ResumeData = {
          personalInfo,
          summary: parsed.summary || parsed.data?.summary || "",
          skills: skillsArray,
          experience: rawExp.map((exp: any) => {
            const responsibilities = Array.isArray(exp.responsibilities)
              ? exp.responsibilities
              : typeof exp.responsibilities === "string"
                ? [exp.responsibilities]
                : Array.isArray(exp.highlights)
                  ? exp.highlights
                  : [];
            return {
              company: exp.company || "",
              title: exp.title || "",
              location: exp.location || "",
              startDate: exp.startDate || "",
              endDate: exp.endDate || "",
              description: exp.description || "",
              responsibilities: responsibilities.filter(Boolean),
            };
          }),
          projects: rawProj.map((proj: any) => {
            const description = Array.isArray(proj.description)
              ? proj.description.join("\n")
              : typeof proj.description === "string"
                ? proj.description
                : Array.isArray(proj.highlights)
                  ? proj.highlights.join("\n")
                  : "";
            return {
              title: proj.title || "",
              description,
              technologies: proj.technologies || (Array.isArray(proj.tech) ? proj.tech.join(", ") : ""),
              date: proj.date || "",
              link: proj.link || undefined,
            };
          }),
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
