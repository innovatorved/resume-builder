export interface PersonalInfo {
  name: string
  title: string
  phone: string
  email: string
  linkedin: string
  location: string
}

export interface Experience {
  title: string
  company: string
  location: string
  startDate: string
  endDate: string
  description: string
  responsibilities: string[]
}

export interface Education {
  degree: string
  institution: string
  location: string
  startDate: string
  endDate: string
}

export interface Certification {
  title: string
  issuer: string
  date: string
}

export interface Project {
  title: string
  startDate: string
  endDate: string
  description: string
  technologies: string
}

export interface Language {
  name: string
  level: string
}

export interface ResumeData {
  personalInfo: PersonalInfo
  summary: string
  experience: Experience[]
  education: Education[]
  skills: string[]
  certifications: Certification[]
  projects: Project[]
  languages: Language[]
}
