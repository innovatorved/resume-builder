import { z } from "zod";

// Personal Info Schema
export const personalInfoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().min(1, "Title is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email address"),
  linkedin: z.string().optional(),
  location: z.string().min(1, "Location is required"),
});

// Experience Schema
export const experienceSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company is required"),
  location: z.string().min(1, "Location is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  description: z.string().optional(),
  responsibilities: z.array(z.string()).default([]),
});

// Education Schema
export const educationSchema = z.object({
  degree: z.string().min(1, "Degree is required"),
  institution: z.string().min(1, "Institution is required"),
  location: z.string().min(1, "Location is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

// Certification Schema
export const certificationSchema = z.object({
  title: z.string().min(1, "Certification title is required"),
  issuer: z.string().min(1, "Issuer is required"),
  date: z.string().min(1, "Date is required"),
  link: z.string().url("Invalid URL").optional().or(z.literal("")),
  skills: z.string().optional(),
});

// Project Schema
export const projectSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  description: z.string().min(1, "Description is required"),
  technologies: z.string().min(1, "Technologies are required"),
});

// Language Schema
export const languageSchema = z.object({
  name: z.string().min(1, "Language name is required"),
  level: z.string().min(1, "Proficiency level is required"),
});

// Main Resume Data Schema
export const resumeDataSchema = z.object({
  personalInfo: personalInfoSchema,
  summary: z.string().min(1, "Summary is required"),
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
});

// Update Resume Schema
export const updateResumeSchema = z.object({
  id: z.string().min(1, "Resume ID is required"),
  name: z.string().min(1, "Resume name is required").optional(),
  data: resumeDataSchema.optional(),
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
