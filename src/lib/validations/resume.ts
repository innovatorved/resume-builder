import z from "zod";

// Personal Info Schema
export const personalInfoSchema = z.object({
  name: z.string().default(""),
  title: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  linkedin: z.string().optional().default(""),
  location: z.string().optional().default(""),
});

// Experience Schema
export const experienceSchema = z.object({
  title: z.string().default(""),
  company: z.string().default(""),
  location: z.string().optional().default(""),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  description: z.string().optional().default(""),
  responsibilities: z.array(z.string()).default([]),
});

// Education Schema
export const educationSchema = z.object({
  degree: z.string().default(""),
  institution: z.string().default(""),
  location: z.string().optional().default(""),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
});

// Certification Schema
export const certificationSchema = z.object({
  title: z.string().default(""),
  issuer: z.string().default(""),
  date: z.string().optional().default(""),
  link: z.string().optional().default(""),
  skills: z.string().optional().default(""),
});

// Project Schema
export const projectSchema = z.object({
  title: z.string().default(""),
  description: z.string().optional().default(""),
  technologies: z.string().optional().default(""),
});

// Language Schema
export const languageSchema = z.object({
  name: z.string().default(""),
  level: z.string().optional().default(""),
});

// Main Resume Data Schema
export const resumeDataSchema = z.object({
  personalInfo: personalInfoSchema.default({
    name: "",
    title: "",
    phone: "",
    email: "",
    linkedin: "",
    location: "",
  }),
  summary: z.string().optional().default(""),
  experience: z.array(experienceSchema).default([]),
  education: z.array(educationSchema).default([]),
  skills: z.array(z.string()).default([]),
  certifications: z.array(certificationSchema).default([]),
  projects: z.array(projectSchema).default([]),
  languages: z.array(languageSchema).default([]),
});

// Resume Schema for database operations
export const resumeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Resume name is required"),
  data: resumeDataSchema,
});

// Create Resume Schema (without id)
export const createResumeSchema = z.object({
  name: z.string().min(1, "Resume name is required"),
  data: resumeDataSchema,
  rawLatex: z.string().optional(),
});

// Update Resume Schema
export const updateResumeSchema = z.object({
  id: z.string().min(1, "Resume ID is required"),
  name: z.string().min(1, "Resume name is required").optional(),
  data: resumeDataSchema.optional(),
  isPinned: z.boolean().optional(),
});

// Types
export type PersonalInfo = z.infer<typeof personalInfoSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Language = z.infer<typeof languageSchema>;
export type ResumeData = z.infer<typeof resumeDataSchema>;
export type Resume = z.infer<typeof resumeSchema>;
export type CreateResume = z.infer<typeof createResumeSchema>;
export type UpdateResume = z.infer<typeof updateResumeSchema>;
