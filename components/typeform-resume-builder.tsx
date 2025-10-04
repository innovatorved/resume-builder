"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { ArrowRight, ArrowLeft, Plus, Trash2, Check, Download } from "lucide-react"
import type { ResumeData } from "@/types/resume"
import { downloadResumePdf } from "@/lib/download-resume-v2"
import { ResumePreview } from "@/components/resume-preview"

interface TypeformResumeBuilderProps {
  data: ResumeData
  onChange: (data: ResumeData) => void
  onComplete: () => void
}

export function TypeformResumeBuilder({ data, onChange, onComplete }: TypeformResumeBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)

  const totalSteps = 9

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

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      nextStep()
    }
  }

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true)
      console.log("[TypeformResumeBuilder] Starting PDF download...")

      await downloadResumePdf(data)
      
      console.log("[TypeformResumeBuilder] PDF download completed successfully!")
      alert("Resume downloaded successfully!")
    } catch (error) {
      console.error("[TypeformResumeBuilder] Error downloading resume:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      alert(`Failed to download resume: ${errorMessage}\n\nPlease check the console for more details.`)
    } finally {
      setIsDownloading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Let&apos;s start with your basics</h2>
              <p className="text-base text-muted-foreground">Tell us about yourself</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Full Name *</label>
                <Input
                  value={data.personalInfo.name}
                  onChange={(e) => updatePersonalInfo("name", e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-base py-2 border-2 focus:border-primary"
                  placeholder="John Doe"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Job Title *</label>
                <Input
                  value={data.personalInfo.title}
                  onChange={(e) => updatePersonalInfo("title", e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-base py-2 border-2 focus:border-primary"
                  placeholder="Software Developer"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Phone *</label>
                  <Input
                    value={data.personalInfo.phone}
                    onChange={(e) => updatePersonalInfo("phone", e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="text-base py-2 border-2 focus:border-primary"
                    placeholder="+1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Email *</label>
                  <Input
                    type="email"
                    value={data.personalInfo.email}
                    onChange={(e) => updatePersonalInfo("email", e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="text-base py-2 border-2 focus:border-primary"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">LinkedIn</label>
                  <Input
                    value={data.personalInfo.linkedin}
                    onChange={(e) => updatePersonalInfo("linkedin", e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="text-base py-2 border-2 focus:border-primary"
                    placeholder="linkedin.com/in/johndoe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Location *</label>
                  <Input
                    value={data.personalInfo.location}
                    onChange={(e) => updatePersonalInfo("location", e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="text-base py-2 border-2 focus:border-primary"
                    placeholder="New York, USA"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Your professional summary</h2>
              <p className="text-base text-muted-foreground">Write a brief overview of your experience and skills</p>
            </div>
            <div className="space-y-2">
              <Textarea
                value={data.summary}
                onChange={(e) => onChange({ ...data, summary: e.target.value })}
                className="text-base py-3 border-2 focus:border-primary min-h-[150px]"
                placeholder="A passionate and driven professional with expertise in..."
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Press Shift + Enter for new line</p>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Work experience</h2>
              <p className="text-base text-muted-foreground">Add your professional experience</p>
            </div>
            <div className="space-y-4">
              {data.experience.map((exp, index) => (
                <Card key={index} className="p-4 border-2 space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-base font-bold text-foreground">Experience {index + 1}</h3>
                    {data.experience.length > 1 && (
                      <Button onClick={() => removeExperience(index)} size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Input
                      value={exp.title}
                      onChange={(e) => updateExperience(index, "title", e.target.value)}
                      className="text-base py-2 border-2"
                      placeholder="Job Title"
                    />
                    <Input
                      value={exp.company}
                      onChange={(e) => updateExperience(index, "company", e.target.value)}
                      className="text-base py-2 border-2"
                      placeholder="Company Name"
                    />
                    <div className="grid md:grid-cols-2 gap-3">
                      <Input
                        value={exp.location}
                        onChange={(e) => updateExperience(index, "location", e.target.value)}
                        className="text-base py-2 border-2"
                        placeholder="Location"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={exp.startDate}
                          onChange={(e) => updateExperience(index, "startDate", e.target.value)}
                          className="text-base py-2 border-2"
                          placeholder="Start (MM/YYYY)"
                        />
                        <Input
                          value={exp.endDate}
                          onChange={(e) => updateExperience(index, "endDate", e.target.value)}
                          className="text-base py-2 border-2"
                          placeholder="End"
                        />
                      </div>
                    </div>
                    <Input
                      value={exp.description}
                      onChange={(e) => updateExperience(index, "description", e.target.value)}
                      className="text-base py-2 border-2"
                      placeholder="Brief company description"
                    />
                    <Textarea
                      value={exp.responsibilities.join("\n")}
                      onChange={(e) => updateExperience(index, "responsibilities", e.target.value.split("\n"))}
                      className="text-sm py-2 border-2 min-h-[100px]"
                      placeholder="Key responsibilities (one per line)"
                    />
                  </div>
                </Card>
              ))}
              <Button
                onClick={addExperience}
                variant="outline"
                size="default"
                className="w-full border-2 bg-transparent"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Experience
              </Button>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Education</h2>
              <p className="text-base text-muted-foreground">Tell us about your educational background</p>
            </div>
            <div className="space-y-4">
              {data.education.map((edu, index) => (
                <Card key={index} className="p-4 border-2 space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-base font-bold text-foreground">Education {index + 1}</h3>
                    {data.education.length > 1 && (
                      <Button onClick={() => removeEducation(index)} size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Input
                      value={edu.degree}
                      onChange={(e) => updateEducation(index, "degree", e.target.value)}
                      className="text-base py-2 border-2"
                      placeholder="Degree (e.g., Bachelor of Science)"
                    />
                    <Input
                      value={edu.institution}
                      onChange={(e) => updateEducation(index, "institution", e.target.value)}
                      className="text-base py-2 border-2"
                      placeholder="Institution Name"
                    />
                    <Input
                      value={edu.location}
                      onChange={(e) => updateEducation(index, "location", e.target.value)}
                      className="text-base py-2 border-2"
                      placeholder="Location"
                    />
                    <div className="flex gap-2">
                      <Input
                        value={edu.startDate}
                        onChange={(e) => updateEducation(index, "startDate", e.target.value)}
                        className="text-base py-2 border-2"
                        placeholder="Start (MM/YYYY)"
                      />
                      <Input
                        value={edu.endDate}
                        onChange={(e) => updateEducation(index, "endDate", e.target.value)}
                        className="text-base py-2 border-2"
                        placeholder="End (MM/YYYY)"
                      />
                    </div>
                  </div>
                </Card>
              ))}
              <Button
                onClick={addEducation}
                variant="outline"
                size="default"
                className="w-full border-2 bg-transparent"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Education
              </Button>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Your skills</h2>
              <p className="text-base text-muted-foreground">List your technical and professional skills</p>
            </div>
            <div className="space-y-2">
              <Textarea
                value={data.skills.join(", ")}
                onChange={(e) => onChange({ ...data, skills: e.target.value.split(",").map((s) => s.trim()) })}
                className="text-base py-3 border-2 focus:border-primary min-h-[150px]"
                placeholder="JavaScript, React, Node.js, Python, SQL, Docker..."
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Separate skills with commas</p>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Certifications</h2>
              <p className="text-base text-muted-foreground">Add your professional certifications</p>
            </div>
            <div className="space-y-4">
              {data.certifications.map((cert, index) => (
                <Card key={index} className="p-4 border-2 space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-base font-bold text-foreground">Certification {index + 1}</h3>
                    {data.certifications.length > 1 && (
                      <Button onClick={() => removeCertification(index)} size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Input
                      value={cert.title}
                      onChange={(e) => updateCertification(index, "title", e.target.value)}
                      className="text-base py-2 border-2"
                      placeholder="Certification Title"
                    />
                    <Input
                      value={cert.issuer}
                      onChange={(e) => updateCertification(index, "issuer", e.target.value)}
                      className="text-base py-2 border-2"
                      placeholder="Issuing Organization"
                    />
                    <Input
                      value={cert.date}
                      onChange={(e) => updateCertification(index, "date", e.target.value)}
                      className="text-base py-2 border-2"
                      placeholder="Date (e.g., Jan 2024)"
                    />
                  </div>
                </Card>
              ))}
              <Button
                onClick={addCertification}
                variant="outline"
                size="default"
                className="w-full border-2 bg-transparent"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Certification
              </Button>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Projects</h2>
              <p className="text-base text-muted-foreground">Showcase your notable projects</p>
            </div>
            <div className="space-y-4">
              {data.projects.map((project, index) => (
                <Card key={index} className="p-4 border-2 space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-base font-bold text-foreground">Project {index + 1}</h3>
                    {data.projects.length > 1 && (
                      <Button onClick={() => removeProject(index)} size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Input
                      value={project.title}
                      onChange={(e) => updateProject(index, "title", e.target.value)}
                      className="text-base py-2 border-2"
                      placeholder="Project Title"
                    />
                    <div className="flex gap-2">
                      <Input
                        value={project.startDate}
                        onChange={(e) => updateProject(index, "startDate", e.target.value)}
                        className="text-base py-2 border-2"
                        placeholder="Start (MM/YYYY)"
                      />
                      <Input
                        value={project.endDate}
                        onChange={(e) => updateProject(index, "endDate", e.target.value)}
                        className="text-base py-2 border-2"
                        placeholder="End"
                      />
                    </div>
                    <Textarea
                      value={project.description}
                      onChange={(e) => updateProject(index, "description", e.target.value)}
                      className="text-sm py-2 border-2 min-h-[80px]"
                      placeholder="Project description"
                    />
                    <Input
                      value={project.technologies}
                      onChange={(e) => updateProject(index, "technologies", e.target.value)}
                      className="text-base py-2 border-2"
                      placeholder="Technologies used (e.g., React, Node.js)"
                    />
                  </div>
                </Card>
              ))}
              <Button onClick={addProject} variant="outline" size="default" className="w-full border-2 bg-transparent">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Project
              </Button>
            </div>
          </div>
        )

      case 7:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Languages</h2>
              <p className="text-base text-muted-foreground">What languages do you speak?</p>
            </div>
            <div className="space-y-4">
              {data.languages.map((lang, index) => (
                <Card key={index} className="p-4 border-2">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <Input
                        value={lang.name}
                        onChange={(e) => updateLanguage(index, "name", e.target.value)}
                        className="text-base py-2 border-2"
                        placeholder="Language (e.g., English)"
                      />
                      <Input
                        value={lang.level}
                        onChange={(e) => updateLanguage(index, "level", e.target.value)}
                        className="text-base py-2 border-2"
                        placeholder="Proficiency (e.g., Native, Fluent, Proficient)"
                      />
                    </div>
                    {data.languages.length > 1 && (
                      <Button onClick={() => removeLanguage(index)} size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
              <Button onClick={addLanguage} variant="outline" size="default" className="w-full border-2 bg-transparent">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Language
              </Button>
            </div>
          </div>
        )

      case 8:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">All done!</h2>
              <p className="text-base text-muted-foreground mb-6">
                Your resume is ready. Click below to view and download it.
              </p>
              <Button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isDownloading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Download Resume
                  </>
                )}
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Hidden Resume Preview for PDF generation */}
      <div style={{ position: 'fixed', left: '-9999px', top: '0' }}>
        <div style={{ width: '210mm', backgroundColor: '#ffffff' }}>
          <ResumePreview data={data} />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl bg-background rounded-lg shadow-lg p-6 md:p-8">{renderStep()}</div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <Button onClick={prevStep} variant="outline" size="default" className="border-2 bg-transparent">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <span className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </span>
          </div>
          <Button onClick={nextStep} size="default" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {currentStep === totalSteps - 1 ? "View Resume" : "Next"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
