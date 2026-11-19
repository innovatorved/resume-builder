import { describe, expect, test } from "bun:test";
import { createResumeSchema, resumeDataSchema, updateResumeSchema } from "./resume";

describe("resume validation schemas", () => {
  const sampleData = {
    personalInfo: {
      name: "Ada Lovelace",
      title: "Staff Engineer",
      phone: "+1 555-0100",
      email: "ada@example.com",
      linkedin: "linkedin.com/in/ada",
      github: "github.com/ada",
      website: "https://ada.dev",
      location: "London, UK",
    },
    summary: "Systems engineer.",
    experience: [],
    education: [],
    skills: ["TypeScript"],
    certifications: [],
    projects: [
      {
        title: "Analytical Engine",
        description: "First computer program.",
        technologies: "Math, Punch Cards",
        date: "1843",
        link: "https://ada.dev/engine",
      },
    ],
    languages: [],
  };

  test("preserves github, website, and project date/link across parse", () => {
    const parsed = resumeDataSchema.parse(sampleData);
    expect(parsed.personalInfo.github).toBe("github.com/ada");
    expect(parsed.personalInfo.website).toBe("https://ada.dev");
    expect(parsed.projects[0].date).toBe("1843");
    expect(parsed.projects[0].link).toBe("https://ada.dev/engine");
  });

  test("createResumeSchema and updateResumeSchema keep optional links", () => {
    const created = createResumeSchema.parse({ name: "My Resume", data: sampleData });
    expect(created.data.personalInfo.github).toBe("github.com/ada");
    expect(created.data.projects[0].link).toBe("https://ada.dev/engine");

    const updated = updateResumeSchema.parse({ id: "res-1", data: sampleData });
    expect(updated.data?.personalInfo.website).toBe("https://ada.dev");
    expect(updated.data?.projects[0].date).toBe("1843");
  });
});
