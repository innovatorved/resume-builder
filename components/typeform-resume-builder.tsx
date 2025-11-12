"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, Plus, Trash2, Check, Download } from "lucide-react";
import type { ResumeData } from "@/types/resume";
import { downloadResumePdf } from "@/lib/download-resume-v2";
import { DOWNLOAD_BUTTON_BASE_CLASSES } from "@/lib/utils";
import { ResumePreview } from "@/components/resume-preview";

interface TypeformResumeBuilderProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  onComplete: () => void;
}

export function TypeformResumeBuilder({ data, onChange, onComplete }: TypeformResumeBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const totalSteps = 9;

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
      console.log("[TypeformResumeBuilder] Starting PDF download...");

      await downloadResumePdf(data);

      console.log("[TypeformResumeBuilder] PDF download completed successfully!");
      alert("Resume downloaded successfully!");
    } catch (error) {
      console.error("[TypeformResumeBuilder] Error downloading resume:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(
        `Failed to download resume: ${errorMessage}\n\nPlease check the console for more details.`
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                Let&apos;s start with your basics
              </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
                Tell us about yourself
              </p>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-base font-medium text-gray-900 dark:text-white">
                  Full Name *
                </label>
                <Input
                  value={data.personalInfo.name}
                  onChange={(e) => updatePersonalInfo("name", e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-lg py-6 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0 transition-colors"
                  placeholder="John Doe"
                  autoFocus
                />
              </div>
              <div className="space-y-3">
                <label className="text-base font-medium text-gray-900 dark:text-white">
                  Job Title *
                </label>
                <Input
                  value={data.personalInfo.title}
                  onChange={(e) => updatePersonalInfo("title", e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-lg py-6 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0 transition-colors"
                  placeholder="Software Developer"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-base font-medium text-gray-900 dark:text-white">
                    Phone *
                  </label>
                  <Input
                    value={data.personalInfo.phone}
                    onChange={(e) => updatePersonalInfo("phone", e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="text-lg py-6 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0 transition-colors"
                    placeholder="+1234567890"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-base font-medium text-gray-900 dark:text-white">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={data.personalInfo.email}
                    onChange={(e) => updatePersonalInfo("email", e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="text-lg py-6 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0 transition-colors"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-base font-medium text-gray-900 dark:text-white">
                    LinkedIn
                  </label>
                  <Input
                    value={data.personalInfo.linkedin}
                    onChange={(e) => updatePersonalInfo("linkedin", e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="text-lg py-6 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0 transition-colors"
                    placeholder="linkedin.com/in/johndoe"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-base font-medium text-gray-900 dark:text-white">
                    Location *
                  </label>
                  <Input
                    value={data.personalInfo.location}
                    onChange={(e) => updatePersonalInfo("location", e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="text-lg py-6 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0 transition-colors"
                    placeholder="New York, USA"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 pt-4">
                <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded">
                  Enter
                </kbd>
                to continue
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                Your professional summary
              </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
                Write a brief overview of your experience and skills
              </p>
            </div>
            <div className="space-y-3">
              <Textarea
                value={data.summary}
                onChange={(e) => onChange({ ...data, summary: e.target.value })}
                className="text-lg py-4 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0 transition-colors min-h-[200px] resize-none"
                placeholder="A passionate and driven professional with expertise in..."
                autoFocus
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded">
                  Shift
                </kbd>
                +
                <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded">
                  Enter
                </kbd>
                for new line
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                Work experience
              </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
                Add your professional experience
              </p>
            </div>
            <div className="space-y-6">
              {data.experience.map((exp, index) => (
                <div
                  key={index}
                  className="p-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 space-y-4 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Experience {index + 1}
                    </h3>
                    {data.experience.length > 1 && (
                      <Button
                        onClick={() => removeExperience(index)}
                        size="sm"
                        variant="destructive"
                        className="bg-red-500 hover:bg-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <Input
                      value={exp.title}
                      onChange={(e) => updateExperience(index, "title", e.target.value)}
                      className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                      placeholder="Job Title"
                    />
                    <Input
                      value={exp.company}
                      onChange={(e) => updateExperience(index, "company", e.target.value)}
                      className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                      placeholder="Company Name"
                    />
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        value={exp.location}
                        onChange={(e) => updateExperience(index, "location", e.target.value)}
                        className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                        placeholder="Location"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={exp.startDate}
                          onChange={(e) => updateExperience(index, "startDate", e.target.value)}
                          className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                          placeholder="Start (MM/YYYY)"
                        />
                        <Input
                          value={exp.endDate}
                          onChange={(e) => updateExperience(index, "endDate", e.target.value)}
                          className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                          placeholder="End"
                        />
                      </div>
                    </div>
                    <Input
                      value={exp.description}
                      onChange={(e) => updateExperience(index, "description", e.target.value)}
                      className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                      placeholder="Brief company description"
                    />
                    <Textarea
                      value={exp.responsibilities.join("\n")}
                      onChange={(e) =>
                        updateExperience(index, "responsibilities", e.target.value.split("\n"))
                      }
                      className="text-base py-4 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0 min-h-[120px] resize-none"
                      placeholder="Key responsibilities (one per line)"
                    />
                  </div>
                </div>
              ))}
              <Button
                onClick={addExperience}
                variant="outline"
                size="default"
                className="w-full py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white/30 dark:bg-slate-800/30 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:border-blue-600 dark:hover:border-blue-500 transition-all"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Another Experience
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                Education
              </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
                Tell us about your educational background
              </p>
            </div>
            <div className="space-y-6">
              {data.education.map((edu, index) => (
                <div
                  key={index}
                  className="p-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 space-y-4 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Education {index + 1}
                    </h3>
                    {data.education.length > 1 && (
                      <Button
                        onClick={() => removeEducation(index)}
                        size="sm"
                        variant="destructive"
                        className="bg-red-500 hover:bg-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <Input
                      value={edu.degree}
                      onChange={(e) => updateEducation(index, "degree", e.target.value)}
                      className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                      placeholder="Degree (e.g., Bachelor of Science)"
                    />
                    <Input
                      value={edu.institution}
                      onChange={(e) => updateEducation(index, "institution", e.target.value)}
                      className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                      placeholder="Institution Name"
                    />
                    <Input
                      value={edu.location}
                      onChange={(e) => updateEducation(index, "location", e.target.value)}
                      className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                      placeholder="Location"
                    />
                    <div className="flex gap-4">
                      <Input
                        value={edu.startDate}
                        onChange={(e) => updateEducation(index, "startDate", e.target.value)}
                        className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                        placeholder="Start (MM/YYYY)"
                      />
                      <Input
                        value={edu.endDate}
                        onChange={(e) => updateEducation(index, "endDate", e.target.value)}
                        className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                        placeholder="End (MM/YYYY)"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                onClick={addEducation}
                variant="outline"
                size="default"
                className="w-full py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white/30 dark:bg-slate-800/30 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:border-blue-600 dark:hover:border-blue-500 transition-all"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Another Education
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                Your skills
              </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
                List your technical and professional skills
              </p>
            </div>
            <div className="space-y-3">
              <Textarea
                value={data.skills.join(", ")}
                onChange={(e) =>
                  onChange({ ...data, skills: e.target.value.split(",").map((s) => s.trim()) })
                }
                className="text-lg py-4 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0 transition-colors min-h-[180px] resize-none"
                placeholder="JavaScript, React, Node.js, Python, SQL, Docker..."
                autoFocus
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                💡 Separate skills with commas
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                Certifications
              </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
                Add your professional certifications
              </p>
            </div>
            <div className="space-y-6">
              {data.certifications.map((cert, index) => (
                <div
                  key={index}
                  className="p-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 space-y-4 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Certification {index + 1}
                    </h3>
                    {data.certifications.length > 1 && (
                      <Button
                        onClick={() => removeCertification(index)}
                        size="sm"
                        variant="destructive"
                        className="bg-red-500 hover:bg-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <Input
                      value={cert.title}
                      onChange={(e) => updateCertification(index, "title", e.target.value)}
                      className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                      placeholder="Certification Title"
                    />
                    <Input
                      value={cert.issuer}
                      onChange={(e) => updateCertification(index, "issuer", e.target.value)}
                      className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                      placeholder="Issuing Organization"
                    />
                    <Input
                      value={cert.date}
                      onChange={(e) => updateCertification(index, "date", e.target.value)}
                      className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                      placeholder="Date (e.g., Jan 2024)"
                    />
                    <Input
                      value={cert.link || ""}
                      onChange={(e) => updateCertification(index, "link", e.target.value)}
                      className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                      placeholder="Certificate Link (optional)"
                    />
                    <Input
                      value={cert.skills || ""}
                      onChange={(e) => updateCertification(index, "skills", e.target.value)}
                      className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                      placeholder="Skills from this certification (optional, comma separated)"
                    />
                  </div>
                </div>
              ))}
              <Button
                onClick={addCertification}
                variant="outline"
                size="default"
                className="w-full py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white/30 dark:bg-slate-800/30 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:border-blue-600 dark:hover:border-blue-500 transition-all"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Another Certification
              </Button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                Projects
              </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
                Showcase your notable projects
              </p>
            </div>
            <div className="space-y-6">
              {data.projects.map((project, index) => (
                <div
                  key={index}
                  className="p-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 space-y-4 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Project {index + 1}
                    </h3>
                    {data.projects.length > 1 && (
                      <Button
                        onClick={() => removeProject(index)}
                        size="sm"
                        variant="destructive"
                        className="bg-red-500 hover:bg-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <Input
                      value={project.title}
                      onChange={(e) => updateProject(index, "title", e.target.value)}
                      className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                      placeholder="Project Title"
                    />
                    <Textarea
                      value={project.description}
                      onChange={(e) => updateProject(index, "description", e.target.value)}
                      className="text-base py-4 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0 min-h-[100px] resize-none"
                      placeholder="Project description"
                    />
                    <Input
                      value={project.technologies}
                      onChange={(e) => updateProject(index, "technologies", e.target.value)}
                      className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                      placeholder="Technologies used (e.g., React, Node.js)"
                    />
                  </div>
                </div>
              ))}
              <Button
                onClick={addProject}
                variant="outline"
                size="default"
                className="w-full py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white/30 dark:bg-slate-800/30 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:border-blue-600 dark:hover:border-blue-500 transition-all"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Another Project
              </Button>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                Languages
              </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
                What languages do you speak?
              </p>
            </div>
            <div className="space-y-6">
              {data.languages.map((lang, index) => (
                <div
                  key={index}
                  className="p-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-4">
                      <Input
                        value={lang.name}
                        onChange={(e) => updateLanguage(index, "name", e.target.value)}
                        className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                        placeholder="Language (e.g., English)"
                      />
                      <Input
                        value={lang.level}
                        onChange={(e) => updateLanguage(index, "level", e.target.value)}
                        className="text-base py-5 border-0 border-b-2 border-gray-300 dark:border-gray-600 rounded-none bg-transparent focus:border-blue-700 dark:focus:border-blue-500 focus-visible:ring-0"
                        placeholder="Proficiency (e.g., Native, Fluent, Proficient)"
                      />
                    </div>
                    {data.languages.length > 1 && (
                      <Button
                        onClick={() => removeLanguage(index)}
                        size="sm"
                        variant="destructive"
                        className="bg-red-500 hover:bg-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button
                onClick={addLanguage}
                variant="outline"
                size="default"
                className="w-full py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white/30 dark:bg-slate-800/30 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:border-blue-600 dark:hover:border-blue-500 transition-all"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Another Language
              </Button>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-8">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-700 shadow-lg shadow-blue-500/30 animate-in zoom-in duration-700">
                <Check className="h-12 w-12 text-white" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                  All done! 🎉
                </h2>
                <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-lg mx-auto">
                  Your professional resume is ready. Click below to view and download it.
                </p>
              </div>
              <Button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                size="lg"
                className={`${DOWNLOAD_BUTTON_BASE_CLASSES} bg-blue-700 hover:bg-blue-800 text-white shadow-xl shadow-blue-500/40 dark:shadow-blue-900/60 hover:scale-105 hover:shadow-2xl transition-transform disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100`}
              >
                {isDownloading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                    <span className="animate-pulse">Generating your resume...</span>
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950">
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
      <div className="fixed top-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5 z-50">
        <div
          className="h-full bg-blue-700 transition-all duration-500 ease-out"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 md:py-24">
        <div className="w-full max-w-3xl">{renderStep()}</div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <Button
                onClick={prevStep}
                variant="outline"
                size="default"
                className="border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              {currentStep + 1} / {totalSteps}
            </span>
          </div>
          <Button
            onClick={nextStep}
            size="default"
            className="bg-blue-700 hover:bg-blue-800 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-900/50 font-semibold px-6 py-5 transition-all hover:shadow-xl hover:scale-105"
          >
            {currentStep === totalSteps - 1 ? "View Resume" : "Next"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
