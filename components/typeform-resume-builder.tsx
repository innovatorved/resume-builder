"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ArrowLeft, Plus, Trash2, Check, Download } from "lucide-react";
import type { ResumeData } from "@/types/resume";
import { downloadResumeLatex, downloadCompiledPdf } from "@/lib/latex-generator";
import { DOWNLOAD_BUTTON_BASE_CLASSES } from "@/lib/utils";
import { ResumePreview } from "@/components/resume-preview";
import { draftManager } from "@/lib/draft-manager";

interface TypeformResumeBuilderProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  onComplete: () => void;
  onBack?: () => void;
}

export function TypeformResumeBuilder({
  data,
  onChange,
  onComplete,
  onBack,
}: TypeformResumeBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const totalSteps = 9;

  const stepLabels = [
    "Basics",
    "Summary",
    "Experience",
    "Education",
    "Skills",
    "Certifications",
    "Projects",
    "Languages",
    "Complete",
  ];

  // Auto-save draft whenever data changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      draftManager.saveDraft(data);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [data]);

  const updatePersonalInfo = (field: string, value: string) => {
    onChange({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value },
    });
  };

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
    });
  };

  const updateExperience = (index: number, field: string, value: string | string[]) => {
    const newExperience = [...data.experience];
    newExperience[index] = { ...newExperience[index], [field]: value };
    onChange({ ...data, experience: newExperience });
  };

  const removeExperience = (index: number) => {
    onChange({ ...data, experience: data.experience.filter((_, i) => i !== index) });
  };

  const addEducation = () => {
    onChange({
      ...data,
      education: [
        ...data.education,
        { degree: "", institution: "", location: "", startDate: "", endDate: "" },
      ],
    });
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const newEducation = [...data.education];
    newEducation[index] = { ...newEducation[index], [field]: value };
    onChange({ ...data, education: newEducation });
  };

  const removeEducation = (index: number) => {
    onChange({ ...data, education: data.education.filter((_, i) => i !== index) });
  };

  const addCertification = () => {
    onChange({
      ...data,
      certifications: [
        ...data.certifications,
        { title: "", issuer: "", date: "", link: "", skills: "" },
      ],
    });
  };

  const updateCertification = (index: number, field: string, value: string) => {
    const newCertifications = [...data.certifications];
    newCertifications[index] = { ...newCertifications[index], [field]: value };
    onChange({ ...data, certifications: newCertifications });
  };

  const removeCertification = (index: number) => {
    onChange({ ...data, certifications: data.certifications.filter((_, i) => i !== index) });
  };

  const addProject = () => {
    onChange({
      ...data,
      projects: [...data.projects, { title: "", description: "", technologies: "" }],
    });
  };

  const updateProject = (index: number, field: string, value: string) => {
    const newProjects = [...data.projects];
    newProjects[index] = { ...newProjects[index], [field]: value };
    onChange({ ...data, projects: newProjects });
  };

  const removeProject = (index: number) => {
    onChange({ ...data, projects: data.projects.filter((_, i) => i !== index) });
  };

  const addLanguage = () => {
    onChange({
      ...data,
      languages: [...data.languages, { name: "", level: "" }],
    });
  };

  const updateLanguage = (index: number, field: string, value: string) => {
    const newLanguages = [...data.languages];
    newLanguages[index] = { ...newLanguages[index], [field]: value };
    onChange({ ...data, languages: newLanguages });
  };

  const removeLanguage = (index: number) => {
    onChange({ ...data, languages: data.languages.filter((_, i) => i !== index) });
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      nextStep();
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      console.log("[TypeformResumeBuilder] Starting PDF compilation...");

      await downloadCompiledPdf(data);

      console.log("[TypeformResumeBuilder] PDF compilation completed successfully!");
      alert("Resume downloaded successfully!");
    } catch (error) {
      console.error("[TypeformResumeBuilder] Error compiling resume:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(
        `Failed to compile resume: ${errorMessage}\n\nPlease check the console for more details.`
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // Shared input class for underline-style inputs
  const inputClass =
    "text-lg py-5 border-0 border-b-2 border-border rounded-none bg-transparent focus:border-primary focus-visible:ring-0 transition-colors placeholder:text-muted-foreground/50";

  const textareaClass =
    "text-lg py-4 border-0 border-b-2 border-border rounded-none bg-transparent focus:border-primary focus-visible:ring-0 transition-colors min-h-[160px] resize-none placeholder:text-muted-foreground/50";

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <h2
                className="text-4xl md:text-5xl text-foreground font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-sans-heading)" }}
              >
                Let's start with your basics
              </h2>
              <p className="text-lg text-muted-foreground">Tell us about yourself.</p>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
                  Full Name *
                </label>
                <Input
                  value={data.personalInfo.name}
                  onChange={(e) => updatePersonalInfo("name", e.target.value)}
                  onKeyPress={handleKeyPress}
                  className={inputClass}
                  placeholder="John Doe"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
                  Job Title *
                </label>
                <Input
                  value={data.personalInfo.title}
                  onChange={(e) => updatePersonalInfo("title", e.target.value)}
                  onKeyPress={handleKeyPress}
                  className={inputClass}
                  placeholder="Software Developer"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
                    Phone *
                  </label>
                  <Input
                    value={data.personalInfo.phone}
                    onChange={(e) => updatePersonalInfo("phone", e.target.value)}
                    onKeyPress={handleKeyPress}
                    className={inputClass}
                    placeholder="+1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={data.personalInfo.email}
                    onChange={(e) => updatePersonalInfo("email", e.target.value)}
                    onKeyPress={handleKeyPress}
                    className={inputClass}
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
                    LinkedIn
                  </label>
                  <Input
                    value={data.personalInfo.linkedin}
                    onChange={(e) => updatePersonalInfo("linkedin", e.target.value)}
                    onKeyPress={handleKeyPress}
                    className={inputClass}
                    placeholder="linkedin.com/in/johndoe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
                    Location *
                  </label>
                  <Input
                    value={data.personalInfo.location}
                    onChange={(e) => updatePersonalInfo("location", e.target.value)}
                    onKeyPress={handleKeyPress}
                    className={inputClass}
                    placeholder="New York, USA"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2 pt-2">
                <kbd className="px-2 py-0.5 text-xs font-medium bg-muted border border-border rounded">
                  Enter
                </kbd>
                to continue
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <h2
                className="text-4xl md:text-5xl text-foreground font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-sans-heading)" }}
              >
                Professional summary
              </h2>
              <p className="text-lg text-muted-foreground">
                A brief overview of your experience and skills.
              </p>
            </div>
            <div className="space-y-2">
              <Textarea
                value={data.summary}
                onChange={(e) => onChange({ ...data, summary: e.target.value })}
                className={textareaClass}
                placeholder="A passionate and driven professional with expertise in…"
                autoFocus
              />
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <kbd className="px-2 py-0.5 text-xs font-medium bg-muted border border-border rounded">
                  Shift
                </kbd>
                +
                <kbd className="px-2 py-0.5 text-xs font-medium bg-muted border border-border rounded">
                  Enter
                </kbd>
                for new line
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <h2
                className="text-4xl md:text-5xl text-foreground font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-sans-heading)" }}
              >
                Work experience
              </h2>
              <p className="text-lg text-muted-foreground">Add your professional experience.</p>
            </div>
            <div className="space-y-8">
              {data.experience.map((exp, index) => (
                <div key={index} className="pb-8 border-b border-border last:border-0 space-y-5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
                      Experience {index + 1}
                    </span>
                    {data.experience.length > 1 && (
                      <button
                        onClick={() => removeExperience(index)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <Input
                      value={exp.title}
                      onChange={(e) => updateExperience(index, "title", e.target.value)}
                      className={inputClass}
                      placeholder="Job Title"
                    />
                    <Input
                      value={exp.company}
                      onChange={(e) => updateExperience(index, "company", e.target.value)}
                      className={inputClass}
                      placeholder="Company Name"
                    />
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        value={exp.location}
                        onChange={(e) => updateExperience(index, "location", e.target.value)}
                        className={inputClass}
                        placeholder="Location"
                      />
                      <div className="flex gap-3">
                        <Input
                          value={exp.startDate || ""}
                          onChange={(e) => updateExperience(index, "startDate", e.target.value)}
                          className={inputClass}
                          placeholder="Start (MM/YYYY)"
                        />
                        <Input
                          value={exp.endDate}
                          onChange={(e) => updateExperience(index, "endDate", e.target.value)}
                          className={inputClass}
                          placeholder="End"
                        />
                      </div>
                    </div>
                    <Input
                      value={exp.description}
                      onChange={(e) => updateExperience(index, "description", e.target.value)}
                      className={inputClass}
                      placeholder="Brief company description"
                    />
                    <Textarea
                      value={exp.responsibilities.join("\n")}
                      onChange={(e) =>
                        updateExperience(index, "responsibilities", e.target.value.split("\n"))
                      }
                      className={`${textareaClass} min-h-[120px]`}
                      placeholder="Key responsibilities (one per line)"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addExperience}
                className="w-full py-5 border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Another Experience
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <h2
                className="text-4xl md:text-5xl text-foreground font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-sans-heading)" }}
              >
                Education
              </h2>
              <p className="text-lg text-muted-foreground">Your educational background.</p>
            </div>
            <div className="space-y-8">
              {data.education.map((edu, index) => (
                <div key={index} className="pb-8 border-b border-border last:border-0 space-y-5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
                      Education {index + 1}
                    </span>
                    {data.education.length > 1 && (
                      <button
                        onClick={() => removeEducation(index)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <Input
                      value={edu.degree}
                      onChange={(e) => updateEducation(index, "degree", e.target.value)}
                      className={inputClass}
                      placeholder="Degree (e.g., Bachelor of Science)"
                    />
                    <Input
                      value={edu.institution}
                      onChange={(e) => updateEducation(index, "institution", e.target.value)}
                      className={inputClass}
                      placeholder="Institution Name"
                    />
                    <Input
                      value={edu.location}
                      onChange={(e) => updateEducation(index, "location", e.target.value)}
                      className={inputClass}
                      placeholder="Location"
                    />
                    <div className="flex gap-4">
                      <Input
                        value={edu.startDate || ""}
                        onChange={(e) => updateEducation(index, "startDate", e.target.value)}
                        className={inputClass}
                        placeholder="Start (MM/YYYY)"
                      />
                      <Input
                        value={edu.endDate}
                        onChange={(e) => updateEducation(index, "endDate", e.target.value)}
                        className={inputClass}
                        placeholder="End (MM/YYYY)"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addEducation}
                className="w-full py-5 border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Another Education
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <h2
                className="text-4xl md:text-5xl text-foreground font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-sans-heading)" }}
              >
                Your skills
              </h2>
              <p className="text-lg text-muted-foreground">
                List your technical and professional skills.
              </p>
            </div>
            <div className="space-y-2">
              <Textarea
                value={data.skills.join(", ")}
                onChange={(e) =>
                  onChange({ ...data, skills: e.target.value.split(",").map((s) => s.trim()) })
                }
                className={textareaClass}
                placeholder="JavaScript, React, Node.js, Python, SQL, Docker…"
                autoFocus
              />
              <p className="text-sm text-muted-foreground">Separate skills with commas.</p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <h2
                className="text-4xl md:text-5xl text-foreground font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-sans-heading)" }}
              >
                Certifications
              </h2>
              <p className="text-lg text-muted-foreground">
                Professional certifications you've earned.
              </p>
            </div>
            <div className="space-y-8">
              {data.certifications.map((cert, index) => (
                <div key={index} className="pb-8 border-b border-border last:border-0 space-y-5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
                      Certification {index + 1}
                    </span>
                    {data.certifications.length > 1 && (
                      <button
                        onClick={() => removeCertification(index)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <Input
                      value={cert.title}
                      onChange={(e) => updateCertification(index, "title", e.target.value)}
                      className={inputClass}
                      placeholder="Certification Title"
                    />
                    <Input
                      value={cert.issuer}
                      onChange={(e) => updateCertification(index, "issuer", e.target.value)}
                      className={inputClass}
                      placeholder="Issuing Organization"
                    />
                    <Input
                      value={cert.date}
                      onChange={(e) => updateCertification(index, "date", e.target.value)}
                      className={inputClass}
                      placeholder="Date (e.g., Jan 2024)"
                    />
                    <Input
                      value={cert.link || ""}
                      onChange={(e) => updateCertification(index, "link", e.target.value)}
                      className={inputClass}
                      placeholder="Certificate Link (optional)"
                    />
                    <Input
                      value={cert.skills || ""}
                      onChange={(e) => updateCertification(index, "skills", e.target.value)}
                      className={inputClass}
                      placeholder="Related skills (optional, comma separated)"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addCertification}
                className="w-full py-5 border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Another Certification
              </button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <h2
                className="text-4xl md:text-5xl text-foreground font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-sans-heading)" }}
              >
                Projects
              </h2>
              <p className="text-lg text-muted-foreground">Showcase your notable projects.</p>
            </div>
            <div className="space-y-8">
              {data.projects.map((project, index) => (
                <div key={index} className="pb-8 border-b border-border last:border-0 space-y-5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
                      Project {index + 1}
                    </span>
                    {data.projects.length > 1 && (
                      <button
                        onClick={() => removeProject(index)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <Input
                      value={project.title}
                      onChange={(e) => updateProject(index, "title", e.target.value)}
                      className={inputClass}
                      placeholder="Project Title"
                    />
                    <Textarea
                      value={project.description}
                      onChange={(e) => updateProject(index, "description", e.target.value)}
                      className={`${textareaClass} min-h-[100px]`}
                      placeholder="Project description"
                    />
                    <Input
                      value={project.technologies}
                      onChange={(e) => updateProject(index, "technologies", e.target.value)}
                      className={inputClass}
                      placeholder="Technologies used (e.g., React, Node.js)"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addProject}
                className="w-full py-5 border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Another Project
              </button>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <h2
                className="text-4xl md:text-5xl text-foreground font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-sans-heading)" }}
              >
                Languages
              </h2>
              <p className="text-lg text-muted-foreground">What languages do you speak?</p>
            </div>
            <div className="space-y-6">
              {data.languages.map((lang, index) => (
                <div key={index} className="pb-6 border-b border-border last:border-0">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-4">
                      <Input
                        value={lang.name}
                        onChange={(e) => updateLanguage(index, "name", e.target.value)}
                        className={inputClass}
                        placeholder="Language (e.g., English)"
                      />
                      <Input
                        value={lang.level}
                        onChange={(e) => updateLanguage(index, "level", e.target.value)}
                        className={inputClass}
                        placeholder="Proficiency (e.g., Native, Fluent)"
                      />
                    </div>
                    {data.languages.length > 1 && (
                      <button
                        onClick={() => removeLanguage(index)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 mt-5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={addLanguage}
                className="w-full py-5 border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Another Language
              </button>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <p className="text-sm font-medium tracking-widest uppercase text-primary animate-in fade-in duration-700">
                  All done
                </p>
                <h2
                  className="text-4xl md:text-5xl text-foreground font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-sans-heading)" }}
                >
                  Your resume is ready
                </h2>
                <p className="text-lg text-muted-foreground max-w-md mx-auto">
                  Click below to download it as a beautifully typeset PDF.
                </p>
              </div>
              <Button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                size="lg"
                className={`${DOWNLOAD_BUTTON_BASE_CLASSES} bg-primary hover:bg-primary/90 text-primary-foreground transition-all disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {isDownloading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-b-2 border-primary-foreground mr-3" />
                    <span className="animate-pulse">Generating your resume…</span>
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-3" />
                    Download Resume
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <span
            className="text-sm font-medium text-foreground"
            style={{ fontFamily: "var(--font-sans-heading)" }}
          >
            Resume Builder
          </span>
          {onBack && (
            <button
              onClick={() => {
                draftManager.saveDraft(data);
                onBack();
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Save & Exit
            </button>
          )}
        </div>
      </div>

      {/* Hidden Resume Preview for PDF generation */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0",
          width: "210mm",
          backgroundColor: "#ffffff",
          margin: "0",
          padding: "0",
          boxSizing: "border-box",
        }}
      >
        <ResumePreview data={data} />
      </div>

      {/* Progress Bar */}
      <div className="fixed top-[49px] left-0 right-0 h-0.5 bg-border z-50">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 md:py-24 mt-14">
        <div className="w-full max-w-3xl">{renderStep()}</div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 sm:p-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {currentStep > 0 && (
              <Button
                onClick={prevStep}
                variant="outline"
                size="default"
                className="border-border hover:bg-muted hover:border-foreground/20 transition-all font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
              {currentStep + 1} / {totalSteps}
              <span className="hidden sm:inline ml-2 normal-case tracking-normal">
                — {stepLabels[currentStep]}
              </span>
            </span>
          </div>
          <Button
            onClick={nextStep}
            size="default"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-5 transition-all"
          >
            {currentStep === totalSteps - 1 ? "View Resume" : "Next"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
