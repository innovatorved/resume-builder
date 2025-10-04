"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import type { ResumeData } from "@/types/resume"

interface ResumeFormProps {
  data: ResumeData
  onChange: (data: ResumeData) => void
}

export function ResumeForm({ data, onChange }: ResumeFormProps) {
  const updatePersonalInfo = (field: string, value: string) => {
    onChange({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value },
    })
  }

  const addExperience = () => {
    onChange({
      ...data,
      experience: [
        ...data.experience,
        {
          title: "",
          company: "",
          location: "",
          startDate: "",
          endDate: "",
          description: "",
          responsibilities: [""],
        },
      ],
    })
  }

  const updateExperience = (index: number, field: string, value: string | string[]) => {
    const newExperience = [...data.experience]
    newExperience[index] = { ...newExperience[index], [field]: value }
    onChange({ ...data, experience: newExperience })
  }

  const removeExperience = (index: number) => {
    onChange({ ...data, experience: data.experience.filter((_, i) => i !== index) })
  }

  const addEducation = () => {
    onChange({
      ...data,
      education: [...data.education, { degree: "", institution: "", location: "", startDate: "", endDate: "" }],
    })
  }

  const updateEducation = (index: number, field: string, value: string) => {
    const newEducation = [...data.education]
    newEducation[index] = { ...newEducation[index], [field]: value }
    onChange({ ...data, education: newEducation })
  }

  const removeEducation = (index: number) => {
    onChange({ ...data, education: data.education.filter((_, i) => i !== index) })
  }

  const addCertification = () => {
    onChange({
      ...data,
      certifications: [...data.certifications, { title: "", issuer: "", date: "" }],
    })
  }

  const updateCertification = (index: number, field: string, value: string) => {
    const newCertifications = [...data.certifications]
    newCertifications[index] = { ...newCertifications[index], [field]: value }
    onChange({ ...data, certifications: newCertifications })
  }

  const removeCertification = (index: number) => {
    onChange({ ...data, certifications: data.certifications.filter((_, i) => i !== index) })
  }

  const addProject = () => {
    onChange({
      ...data,
      projects: [...data.projects, { title: "", startDate: "", endDate: "", description: "", technologies: "" }],
    })
  }

  const updateProject = (index: number, field: string, value: string) => {
    const newProjects = [...data.projects]
    newProjects[index] = { ...newProjects[index], [field]: value }
    onChange({ ...data, projects: newProjects })
  }

  const removeProject = (index: number) => {
    onChange({ ...data, projects: data.projects.filter((_, i) => i !== index) })
  }

  const addLanguage = () => {
    onChange({
      ...data,
      languages: [...data.languages, { name: "", level: "" }],
    })
  }

  const updateLanguage = (index: number, field: string, value: string) => {
    const newLanguages = [...data.languages]
    newLanguages[index] = { ...newLanguages[index], [field]: value }
    onChange({ ...data, languages: newLanguages })
  }

  const removeLanguage = (index: number) => {
    onChange({ ...data, languages: data.languages.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-8">
      {/* Personal Information */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-primary uppercase tracking-wide border-b-2 border-primary pb-2">
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground font-semibold">
              Full Name
            </Label>
            <Input
              id="name"
              value={data.personalInfo.name}
              onChange={(e) => updatePersonalInfo("name", e.target.value)}
              className="border-2 border-primary"
              placeholder="JOHN DOE"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground font-semibold">
              Job Title
            </Label>
            <Input
              id="title"
              value={data.personalInfo.title}
              onChange={(e) => updatePersonalInfo("title", e.target.value)}
              className="border-2 border-primary"
              placeholder="Software Developer"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground font-semibold">
              Phone
            </Label>
            <Input
              id="phone"
              value={data.personalInfo.phone}
              onChange={(e) => updatePersonalInfo("phone", e.target.value)}
              className="border-2 border-primary"
              placeholder="+1234567890"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground font-semibold">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={data.personalInfo.email}
              onChange={(e) => updatePersonalInfo("email", e.target.value)}
              className="border-2 border-primary"
              placeholder="john.doe@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin" className="text-foreground font-semibold">
              LinkedIn
            </Label>
            <Input
              id="linkedin"
              value={data.personalInfo.linkedin}
              onChange={(e) => updatePersonalInfo("linkedin", e.target.value)}
              className="border-2 border-primary"
              placeholder="linkedin.com/in/johndoe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location" className="text-foreground font-semibold">
              Location
            </Label>
            <Input
              id="location"
              value={data.personalInfo.location}
              onChange={(e) => updatePersonalInfo("location", e.target.value)}
              className="border-2 border-primary"
              placeholder="New York, USA"
            />
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-primary uppercase tracking-wide border-b-2 border-primary pb-2">
          Professional Summary
        </h3>
        <div className="space-y-2">
          <Label htmlFor="summary" className="text-foreground font-semibold">
            Summary
          </Label>
          <Textarea
            id="summary"
            value={data.summary}
            onChange={(e) => onChange({ ...data, summary: e.target.value })}
            className="border-2 border-primary min-h-[120px]"
            placeholder="A passionate and driven professional with expertise in..."
          />
        </div>
      </section>

      {/* Experience */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-primary pb-2">
          <h3 className="text-lg font-bold text-primary uppercase tracking-wide">Experience</h3>
          <Button
            onClick={addExperience}
            size="sm"
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {data.experience.map((exp, index) => (
          <Card key={index} className="p-4 border-2 border-primary space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-semibold text-foreground">Experience {index + 1}</h4>
              <Button onClick={() => removeExperience(index)} size="sm" variant="destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Job Title</Label>
                <Input
                  value={exp.title}
                  onChange={(e) => updateExperience(index, "title", e.target.value)}
                  className="border-2 border-muted"
                  placeholder="Software Engineer"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Company</Label>
                <Input
                  value={exp.company}
                  onChange={(e) => updateExperience(index, "company", e.target.value)}
                  className="border-2 border-muted"
                  placeholder="Tech Corp"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Location</Label>
                <Input
                  value={exp.location}
                  onChange={(e) => updateExperience(index, "location", e.target.value)}
                  className="border-2 border-muted"
                  placeholder="New York, USA"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Date Range</Label>
                <div className="flex gap-2">
                  <Input
                    value={exp.startDate}
                    onChange={(e) => updateExperience(index, "startDate", e.target.value)}
                    className="border-2 border-muted"
                    placeholder="01/2020"
                  />
                  <Input
                    value={exp.endDate}
                    onChange={(e) => updateExperience(index, "endDate", e.target.value)}
                    className="border-2 border-muted"
                    placeholder="Present"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-semibold">Description</Label>
              <Input
                value={exp.description}
                onChange={(e) => updateExperience(index, "description", e.target.value)}
                className="border-2 border-muted"
                placeholder="Brief company description"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-semibold">Responsibilities (one per line)</Label>
              <Textarea
                value={exp.responsibilities.join("\n")}
                onChange={(e) => updateExperience(index, "responsibilities", e.target.value.split("\n"))}
                className="border-2 border-muted min-h-[100px]"
                placeholder="• Developed web applications&#10;• Collaborated with team members"
              />
            </div>
          </Card>
        ))}
      </section>

      {/* Education */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-primary pb-2">
          <h3 className="text-lg font-bold text-primary uppercase tracking-wide">Education</h3>
          <Button
            onClick={addEducation}
            size="sm"
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {data.education.map((edu, index) => (
          <Card key={index} className="p-4 border-2 border-primary space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-semibold text-foreground">Education {index + 1}</h4>
              <Button onClick={() => removeEducation(index)} size="sm" variant="destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Degree</Label>
                <Input
                  value={edu.degree}
                  onChange={(e) => updateEducation(index, "degree", e.target.value)}
                  className="border-2 border-muted"
                  placeholder="Bachelor of Science"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Institution</Label>
                <Input
                  value={edu.institution}
                  onChange={(e) => updateEducation(index, "institution", e.target.value)}
                  className="border-2 border-muted"
                  placeholder="University Name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Location</Label>
                <Input
                  value={edu.location}
                  onChange={(e) => updateEducation(index, "location", e.target.value)}
                  className="border-2 border-muted"
                  placeholder="City, Country"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Date Range</Label>
                <div className="flex gap-2">
                  <Input
                    value={edu.startDate}
                    onChange={(e) => updateEducation(index, "startDate", e.target.value)}
                    className="border-2 border-muted"
                    placeholder="08/2020"
                  />
                  <Input
                    value={edu.endDate}
                    onChange={(e) => updateEducation(index, "endDate", e.target.value)}
                    className="border-2 border-muted"
                    placeholder="05/2024"
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </section>

      {/* Skills */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-primary uppercase tracking-wide border-b-2 border-primary pb-2">
          Skills
        </h3>
        <div className="space-y-2">
          <Label htmlFor="skills" className="text-foreground font-semibold">
            Skills (comma-separated)
          </Label>
          <Textarea
            id="skills"
            value={data.skills.join(", ")}
            onChange={(e) => onChange({ ...data, skills: e.target.value.split(",").map((s) => s.trim()) })}
            className="border-2 border-primary min-h-[100px]"
            placeholder="JavaScript, React, Node.js, Python, SQL"
          />
        </div>
      </section>

      {/* Certifications */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-primary pb-2">
          <h3 className="text-lg font-bold text-primary uppercase tracking-wide">Certifications</h3>
          <Button
            onClick={addCertification}
            size="sm"
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {data.certifications.map((cert, index) => (
          <Card key={index} className="p-4 border-2 border-primary space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-semibold text-foreground">Certification {index + 1}</h4>
              <Button onClick={() => removeCertification(index)} size="sm" variant="destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Title</Label>
                <Input
                  value={cert.title}
                  onChange={(e) => updateCertification(index, "title", e.target.value)}
                  className="border-2 border-muted"
                  placeholder="AWS Certified Developer"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Issuer</Label>
                <Input
                  value={cert.issuer}
                  onChange={(e) => updateCertification(index, "issuer", e.target.value)}
                  className="border-2 border-muted"
                  placeholder="Amazon Web Services"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Date</Label>
                <Input
                  value={cert.date}
                  onChange={(e) => updateCertification(index, "date", e.target.value)}
                  className="border-2 border-muted"
                  placeholder="Jan 2024"
                />
              </div>
            </div>
          </Card>
        ))}
      </section>

      {/* Projects */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-primary pb-2">
          <h3 className="text-lg font-bold text-primary uppercase tracking-wide">Projects</h3>
          <Button
            onClick={addProject}
            size="sm"
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {data.projects.map((project, index) => (
          <Card key={index} className="p-4 border-2 border-primary space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-semibold text-foreground">Project {index + 1}</h4>
              <Button onClick={() => removeProject(index)} size="sm" variant="destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Project Title</Label>
                <Input
                  value={project.title}
                  onChange={(e) => updateProject(index, "title", e.target.value)}
                  className="border-2 border-muted"
                  placeholder="E-commerce Platform"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Date Range</Label>
                <div className="flex gap-2">
                  <Input
                    value={project.startDate}
                    onChange={(e) => updateProject(index, "startDate", e.target.value)}
                    className="border-2 border-muted"
                    placeholder="01/2023"
                  />
                  <Input
                    value={project.endDate}
                    onChange={(e) => updateProject(index, "endDate", e.target.value)}
                    className="border-2 border-muted"
                    placeholder="Present"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-semibold">Description</Label>
              <Textarea
                value={project.description}
                onChange={(e) => updateProject(index, "description", e.target.value)}
                className="border-2 border-muted min-h-[80px]"
                placeholder="Developed a full-stack e-commerce platform..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-semibold">Technologies</Label>
              <Input
                value={project.technologies}
                onChange={(e) => updateProject(index, "technologies", e.target.value)}
                className="border-2 border-muted"
                placeholder="React, Node.js, MongoDB"
              />
            </div>
          </Card>
        ))}
      </section>

      {/* Languages */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-primary pb-2">
          <h3 className="text-lg font-bold text-primary uppercase tracking-wide">Languages</h3>
          <Button
            onClick={addLanguage}
            size="sm"
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {data.languages.map((lang, index) => (
          <Card key={index} className="p-4 border-2 border-primary">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-foreground font-semibold">Language</Label>
                <Input
                  value={lang.name}
                  onChange={(e) => updateLanguage(index, "name", e.target.value)}
                  className="border-2 border-muted"
                  placeholder="English"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-foreground font-semibold">Level</Label>
                <Input
                  value={lang.level}
                  onChange={(e) => updateLanguage(index, "level", e.target.value)}
                  className="border-2 border-muted"
                  placeholder="Native / Fluent / Proficient"
                />
              </div>
              <Button onClick={() => removeLanguage(index)} size="sm" variant="destructive" className="mt-8">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </section>
    </div>
  )
}
